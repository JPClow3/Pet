"use client";

import {
  ArrowLeft,
  ArrowRight,
  Cat,
  Check,
  Dog,
  PawPrint,
  ShieldCheck,
  Stethoscope,
  Weight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { isValidDateKey, todayKey } from "@/lib/domain/dates";
import { healthTypeMeta, speciesLabels } from "@/lib/domain/labels";
import { petAge } from "@/lib/domain/pet";
import type { HealthRecordType, Species } from "@/lib/domain/schema";
import type { NewPetInput } from "@/lib/store/app-store";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";
import { useFormDraft } from "@/lib/use-form-draft";

const onboardingDraftSchema = z.object({
  step: z.number().int().min(0).max(3),
  tutorName: z.string().max(60),
  email: z.string().max(120),
  city: z.string().max(60),
  pet: z.object({
    name: z.string().max(60),
    species: z.enum(["cao", "gato", "outro"]),
    breed: z.string().max(60).nullable(),
    birthDate: z.string().max(10).nullable(),
  }),
  weightInput: z.string().max(40),
  careType: z.enum(["vacina", "consulta", "peso", "observacao"]).nullable(),
  careTitle: z.string().max(80),
  careDate: z.string().max(10),
  nextDueDate: z.string().max(10),
});

const steps = ["Você", "Seu pet", "Detalhes", "Primeiro cuidado"] as const;
const careChoices: {
  type: HealthRecordType;
  label: string;
  icon: typeof Stethoscope;
  hint: string;
}[] = [
  {
    type: "vacina",
    label: "Vacina",
    icon: ShieldCheck,
    hint: "Uma dose ou reforço",
  },
  {
    type: "consulta",
    label: "Consulta",
    icon: Stethoscope,
    hint: "Uma visita ao veterinário",
  },
  { type: "peso", label: "Peso", icon: Weight, hint: "Acompanhar uma medida" },
  {
    type: "observacao",
    label: "Observação",
    icon: PawPrint,
    hint: "Algo importante de lembrar",
  },
];

const initialPet: NewPetInput = {
  name: "",
  species: "cao",
  sex: "nao_informado",
  birthDate: null,
  breed: null,
  weightKg: null,
  photo: null,
  color: null,
  microchip: null,
  notes: null,
  routine: [],
};

const speciesOptions: { value: Species; label: string; icon: typeof Dog }[] = [
  { value: "cao", label: speciesLabels.cao, icon: Dog },
  { value: "gato", label: speciesLabels.gato, icon: Cat },
  { value: "outro", label: speciesLabels.outro, icon: PawPrint },
];

export default function OnboardingPage() {
  const router = useRouter();
  const ready = useHydrated();
  const hasTutor = useAppStore((state) => Boolean(state.tutor));
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const tracked = useRef(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);

  const initialDraft = useMemo<z.infer<typeof onboardingDraftSchema>>(
    () => ({
      step: 0,
      tutorName: "",
      email: "",
      city: "",
      pet: { name: "", species: "cao", breed: null, birthDate: null },
      weightInput: "",
      careType: null,
      careTitle: "",
      careDate: todayKey(),
      nextDueDate: "",
    }),
    [],
  );
  const draft = useFormDraft({
    key: "onboarding",
    schema: onboardingDraftSchema,
    initialValue: initialDraft,
    enabled: ready && !hasTutor,
  });
  const {
    step,
    tutorName,
    email,
    city,
    pet,
    weightInput,
    careType,
    careTitle,
    careDate,
    nextDueDate,
  } = draft.value;
  const parsedWeight = weightInput.trim()
    ? Number(weightInput.replace(",", "."))
    : null;
  function setDraftField<K extends keyof typeof initialDraft>(
    key: K,
    value: (typeof initialDraft)[K],
  ) {
    draft.setValue((current) => ({ ...current, [key]: value }));
  }
  function setStep(next: number | ((current: number) => number)) {
    draft.setValue((current) => ({
      ...current,
      step: typeof next === "function" ? next(current.step) : next,
    }));
    setError(null);
  }
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const ageLabel = useMemo(
    () => (pet.birthDate ? petAge(pet.birthDate)?.label : null),
    [pet.birthDate],
  );

  useEffect(() => {
    if (ready && hasTutor) router.replace("/");
  }, [ready, hasTutor, router]);

  useEffect(() => {
    if (!ready || !draft.ready || hasTutor) return;
    stepHeading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step, ready, draft.ready, hasTutor]);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void useAppStore
      .getState()
      .track("onboarding_started")
      .catch(() => {});
  }, []);

  function validateCurrentStep() {
    if (step === 0 && tutorName.trim().length === 0) {
      setError("Como podemos te chamar?");
      return false;
    }
    if (
      step === 0 &&
      email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      setError("Confira o e-mail ou deixe esse campo opcional vazio.");
      return false;
    }
    if (step === 1 && pet.name.trim().length === 0) {
      setError("Dê um nome para seu pet para continuar.");
      return false;
    }
    if (step === 2) {
      const weight = parsedWeight;
      if (
        weight !== null &&
        (typeof weight !== "number" ||
          !Number.isFinite(weight) ||
          weight <= 0 ||
          weight > 120)
      ) {
        setError(
          "Informe um peso maior que zero e de até 120 kg, por exemplo 12,4.",
        );
        return false;
      }
      if (
        pet.birthDate &&
        (!isValidDateKey(pet.birthDate) || pet.birthDate > todayKey())
      ) {
        setError("Informe uma data de nascimento válida, até hoje.");
        return false;
      }
    }
    if (step === 3 && careType && !isValidDateKey(careDate)) {
      setError("Escolha a data em que esse cuidado aconteceu.");
      return false;
    }
    if (step === 3 && careType && careDate > todayKey()) {
      setError("Use a data em que o cuidado aconteceu, até hoje.");
      return false;
    }
    if (
      step === 3 &&
      careType &&
      nextDueDate &&
      (!isValidDateKey(nextDueDate) || nextDueDate < careDate)
    ) {
      setError(
        "O próximo cuidado precisa ser na mesma data ou depois do registro.",
      );
      return false;
    }
    if (step === 3 && careType === "peso" && parsedWeight === null) {
      setError("Volte aos detalhes e informe o peso para guardar uma medida.");
      return false;
    }
    setError(null);
    return true;
  }

  function goNext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function finish(skipCare = false) {
    if ((!skipCare && !validateCurrentStep()) || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await completeOnboarding({
        tutorName: tutorName.trim(),
        email: email.trim() || null,
        city: city.trim(),
        focusAreas: ["saude", "rotina"],
        pet: {
          ...initialPet,
          ...pet,
          name: pet.name.trim(),
          breed: pet.breed?.trim() || null,
          birthDate: pet.birthDate || null,
          weightKg: parsedWeight,
        },
        initialRecord:
          careType && !skipCare
            ? {
                type: careType,
                title: careTitle.trim() || healthTypeMeta[careType].label,
                date: careDate || todayKey(),
                nextDueDate: nextDueDate || null,
                leadDays: nextDueDate
                  ? healthTypeMeta[careType].defaultLeadDays
                  : 0,
                recurrenceMonths: null,
                professional: null,
                notes: null,
                attachmentName: null,
                attachmentData: null,
                weightKg: careType === "peso" ? parsedWeight : null,
              }
            : undefined,
      });
      draft.clearDraft();
      router.replace("/");
    } catch {
      setError(
        "Não foi possível salvar neste aparelho. Seus dados continuam aqui para você tentar novamente.",
      );
      setSaving(false);
      savingRef.current = false;
    }
  }

  function setOptionalPetField<K extends keyof typeof pet>(
    key: K,
    value: (typeof pet)[K],
  ) {
    draft.setValue((current) => ({
      ...current,
      pet: { ...current.pet, [key]: value },
    }));
    setError(null);
  }

  if (!ready || (!draft.ready && !hasTutor))
    return <SkeletonScreen label="Abrindo seu cadastro" />;

  return (
    <main className="min-h-dvh bg-canvas">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-8 pt-5 sm:px-8 lg:py-8">
        <header className="flex items-center gap-3">
          {/* One meaning for "back": the previous step, Welcome only from step 1. */}
          {step === 0 ? (
            <ButtonLink
              href="/welcome"
              variant="ghost"
              size="icon"
              aria-label="Voltar para o início"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </ButtonLink>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStep(step - 1)}
              disabled={saving}
              aria-label={`Voltar para a etapa anterior: ${steps[step - 1]}`}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Button>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <p className="text-meta font-semibold text-blue-deep">
                Começar na Zelupi
              </p>
              <span className="text-meta tabular-nums text-muted">
                {step + 1}/{steps.length}
              </span>
            </div>
            <div
              className="mt-2 grid grid-cols-4 gap-1.5"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={steps.length}
              aria-valuenow={step + 1}
              aria-label={`Etapa ${step + 1} de ${steps.length}: ${steps[step]}`}
            >
              {steps.map((label, index) => (
                <span
                  key={label}
                  className={cn(
                    "h-1.5 rounded-full transition-colors duration-200",
                    index <= step ? "bg-blue" : "bg-line",
                  )}
                />
              ))}
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col pt-10">
          {draft.restored || draft.storageError ? (
            <p
              role="status"
              className="mb-4 rounded-card border border-line bg-surface px-4 py-3 text-meta text-ink-soft"
            >
              {draft.storageError ??
                "Seu rascunho foi recuperado nesta aba. Continue de onde parou."}
            </p>
          ) : null}
          <div className="mb-8">
            <h1
              ref={stepHeading}
              tabIndex={-1}
              className="mt-2 font-editorial text-[clamp(2rem,8vw,3.25rem)] font-semibold leading-tight tracking-[-0.03em] text-ink outline-none"
            >
              {step === 0 ? "Vamos começar pelo seu nome." : null}
              {step === 1 ? "De quem você cuida todos os dias?" : null}
              {step === 2
                ? `Um pouco mais sobre ${pet.name.trim() || "seu pet"}.`
                : null}
              {step === 3 ? "Quer guardar um cuidado real?" : null}
            </h1>
            <p className="mt-3 max-w-[42ch] text-body leading-relaxed text-ink-soft">
              {step === 0
                ? "Seu espaço fica salvo neste aparelho. Você pode completar o restante quando fizer sentido."
                : step === 1
                  ? "Nome e espécie bastam para criar o perfil. Foto e outros detalhes podem esperar."
                  : step === 2
                    ? "Essas informações são opcionais e ajudam a deixar o perfil mais útil depois."
                    : "Uma data que já aconteceu dá o primeiro ponto para a história. Se preferir, você pode fazer isso depois."}
            </p>
          </div>

          {step === 0 ? (
            <form className="flex flex-1 flex-col" onSubmit={goNext} noValidate>
              <div className="flex flex-col gap-5">
                <Field label="Seu nome" htmlFor="tutor-name" error={error}>
                  <Input
                    id="tutor-name"
                    autoComplete="name"
                    value={tutorName}
                    onChange={(event) => {
                      setDraftField("tutorName", event.target.value);
                      setError(null);
                    }}
                    placeholder="Como podemos te chamar?"
                    maxLength={60}
                    required
                  />
                </Field>
                <details className="group rounded-feature border border-line bg-paper p-4 open:shadow-card">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-body font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    <span>Adicionar detalhes opcionais</span>
                    <span className="text-meta font-medium text-teal-ink group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
                    <Field
                      label="E-mail"
                      htmlFor="tutor-email"
                      hint="Opcional. Este campo não cria uma conta nem recupera dados por e-mail."
                    >
                      <Input
                        id="tutor-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) =>
                          setDraftField("email", event.target.value)
                        }
                        placeholder="voce@email.com"
                        maxLength={120}
                      />
                    </Field>
                    <Field
                      label="Cidade"
                      htmlFor="tutor-city"
                      hint="Opcional. Usada só para mostrar locais perto de você."
                    >
                      <Input
                        id="tutor-city"
                        autoComplete="address-level2"
                        placeholder="Ex.: Recife"
                        value={city}
                        onChange={(event) =>
                          setDraftField("city", event.target.value)
                        }
                        maxLength={60}
                      />
                    </Field>
                  </div>
                </details>
              </div>
              <div className="mt-auto flex flex-col gap-3 pt-10">
                <Button
                  type="submit"
                  variant="blue"
                  size="lg"
                  className="w-full"
                >
                  Continuar <ArrowRight aria-hidden="true" className="size-5" />
                </Button>
                <p className="flex items-center justify-center gap-2 text-center text-meta text-muted">
                  <LockIcon aria-hidden="true" />
                  Sem pedido de localização ou notificações agora
                </p>
              </div>
            </form>
          ) : null}

          {step === 1 ? (
            <form className="flex flex-1 flex-col" onSubmit={goNext} noValidate>
              <div className="flex flex-col gap-6">
                <Field label="Nome do pet" htmlFor="pet-name" error={error}>
                  <Input
                    id="pet-name"
                    value={pet.name}
                    onChange={(event) =>
                      setOptionalPetField("name", event.target.value)
                    }
                    placeholder="Luna"
                    maxLength={60}
                    required
                  />
                </Field>

                <fieldset>
                  <legend className="text-label font-semibold text-ink">
                    Espécie
                  </legend>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {speciesOptions.map((option) => {
                      const Icon = option.icon;
                      const selected = pet.species === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setOptionalPetField("species", option.value)
                          }
                          className={cn(
                            "flex min-h-24 flex-col items-center justify-center gap-2 rounded-feature border px-3 text-label font-semibold transition-[background-color,border-color] duration-150",
                            selected
                              ? "border-blue bg-blue-soft text-blue-deep"
                              : "border-line bg-paper text-ink-soft hover:bg-surface",
                          )}
                        >
                          <Icon aria-hidden="true" className="size-6" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
              <div className="mt-auto flex flex-col gap-3 pt-10">
                <Button
                  type="submit"
                  variant="blue"
                  size="lg"
                  className="w-full"
                >
                  Continuar <ArrowRight aria-hidden="true" className="size-5" />
                </Button>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="min-h-11 text-meta font-semibold text-muted hover:text-ink"
                >
                  Voltar
                </button>
              </div>
            </form>
          ) : null}

          {step === 2 ? (
            <form className="flex flex-1 flex-col" onSubmit={goNext} noValidate>
              <div className="flex flex-col gap-5">
                {error ? (
                  <p
                    className="rounded-card bg-accent-soft px-3 py-2 text-meta font-medium text-danger-ink"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Raça" htmlFor="pet-breed" hint="Opcional">
                    <Input
                      id="pet-breed"
                      value={pet.breed ?? ""}
                      onChange={(event) =>
                        setOptionalPetField("breed", event.target.value || null)
                      }
                      placeholder="Sem raça definida"
                      maxLength={60}
                    />
                  </Field>
                  <Field
                    label="Nascimento"
                    htmlFor="pet-birth"
                    hint="Pode ser aproximada"
                  >
                    <Input
                      id="pet-birth"
                      type="date"
                      max={todayKey()}
                      value={pet.birthDate ?? ""}
                      onChange={(event) =>
                        setOptionalPetField(
                          "birthDate",
                          event.target.value || null,
                        )
                      }
                    />
                  </Field>
                </div>
                <Field
                  label="Peso"
                  htmlFor="pet-weight"
                  hint="Opcional, em quilos"
                >
                  <Input
                    id="pet-weight"
                    inputMode="decimal"
                    value={weightInput}
                    onChange={(event) => {
                      setDraftField("weightInput", event.target.value);
                      setError(null);
                    }}
                    placeholder="12,4"
                  />
                </Field>
                <div className="flex items-start gap-3 rounded-card border border-line/80 bg-surface-subtle p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-teal-ink">
                    <PawPrint aria-hidden="true" className="size-4" />
                  </span>
                  <p className="text-meta leading-relaxed text-muted">
                    Você poderá adicionar foto, cor, microchip e observações no
                    perfil de {pet.name || "seu pet"}.
                  </p>
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-3 pt-10">
                <Button
                  type="submit"
                  variant="blue"
                  size="lg"
                  className="w-full"
                >
                  Continuar <ArrowRight aria-hidden="true" className="size-5" />
                </Button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-11 text-meta font-semibold text-muted hover:text-ink"
                >
                  Voltar
                </button>
              </div>
            </form>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-1 flex-col">
              {error ? (
                <p
                  className="mb-4 rounded-card bg-accent-soft px-3 py-2 text-meta font-medium text-danger-ink"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              <fieldset>
                <legend className="sr-only">Escolha o tipo de cuidado</legend>
                <div className="grid grid-cols-2 gap-2">
                  {careChoices.map((choice) => {
                    const Icon = choice.icon;
                    const selected = careType === choice.type;
                    return (
                      <button
                        key={choice.type}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          draft.setValue((current) => ({
                            ...current,
                            careType: selected
                              ? null
                              : (choice.type as typeof careType),
                            careTitle: "",
                          }));
                          setError(null);
                        }}
                        className={cn(
                          "flex min-h-28 flex-col items-start justify-between rounded-feature border p-4 text-left transition-[background-color,border-color] duration-150",
                          selected
                            ? "border-blue bg-blue-soft text-blue-deep"
                            : "border-line bg-paper text-ink-soft hover:bg-surface",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-card",
                            selected
                              ? "bg-paper text-teal-ink"
                              : "bg-surface text-ink-soft",
                          )}
                        >
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <span>
                          <span className="block text-body font-semibold">
                            {choice.label}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block text-meta",
                              selected ? "text-teal-ink/80" : "text-muted",
                            )}
                          >
                            {choice.hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {careType ? (
                <form
                  className="mt-5 flex flex-col gap-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    finish();
                  }}
                  noValidate
                >
                  <Field
                    label="O que você quer guardar?"
                    htmlFor="care-title"
                    hint="Opcional; você pode usar o nome sugerido"
                  >
                    <Input
                      id="care-title"
                      disabled={saving}
                      autoFocus
                      value={careTitle}
                      onChange={(event) =>
                        setDraftField("careTitle", event.target.value)
                      }
                      placeholder={healthTypeMeta[careType].label}
                      maxLength={80}
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Quando aconteceu?" htmlFor="care-date">
                      <Input
                        id="care-date"
                        disabled={saving}
                        type="date"
                        value={careDate}
                        max={todayKey()}
                        onChange={(event) =>
                          setDraftField("careDate", event.target.value)
                        }
                        required
                      />
                    </Field>
                    <Field
                      label="Lembrar novamente"
                      htmlFor="care-next"
                      hint="Opcional; só cria aviso com uma data real"
                    >
                      <Input
                        id="care-next"
                        disabled={saving}
                        type="date"
                        min={careDate || todayKey()}
                        value={nextDueDate}
                        onChange={(event) =>
                          setDraftField("nextDueDate", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <p className="flex items-start gap-2 rounded-card bg-mint/60 px-3 py-2.5 text-meta leading-relaxed text-teal-ink">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0"
                    />
                    Este registro fica no histórico de {pet.name}. Nenhuma
                    recomendação clínica é criada automaticamente.
                  </p>
                  <Button
                    type="submit"
                    variant="blue"
                    size="lg"
                    className="w-full"
                    disabled={saving}
                  >
                    {saving
                      ? "Salvando…"
                      : `Criar espaço e guardar ${healthTypeMeta[careType].label.toLowerCase()}`}
                  </Button>
                </form>
              ) : null}

              <div
                className={cn(
                  "mt-auto flex flex-col gap-3 pt-10",
                  careType
                    ? "sm:flex-row-reverse sm:items-center sm:justify-between"
                    : "",
                )}
              >
                {!careType ? (
                  <Button
                    variant="blue"
                    size="lg"
                    className="w-full"
                    onClick={() => finish()}
                    disabled={saving}
                  >
                    {saving ? "Salvando…" : "Criar meu espaço"}
                    <ArrowRight aria-hidden="true" className="size-5" />
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={() => (careType ? finish(true) : setStep(2))}
                  disabled={saving}
                  className="min-h-11 text-meta font-semibold text-muted hover:text-ink disabled:opacity-50"
                >
                  {careType ? "Agora não, guardar depois" : "Voltar"}
                </button>
                {careType ? (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="min-h-11 text-meta font-semibold text-muted hover:text-ink"
                  >
                    Voltar
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 2 && ageLabel ? (
            <p className="sr-only">Idade aproximada: {ageLabel}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <ShieldCheck
      className={cn("size-3.5 shrink-0", className)}
      aria-hidden="true"
    />
  );
}
