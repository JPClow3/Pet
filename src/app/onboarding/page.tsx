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

import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { todayKey } from "@/lib/domain/dates";
import { healthTypeMeta, speciesLabels } from "@/lib/domain/labels";
import { petAge } from "@/lib/domain/pet";
import type { HealthRecordType, Species } from "@/lib/domain/schema";
import type { NewPetInput } from "@/lib/store/app-store";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";

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
  const addRecord = useAppStore((state) => state.addRecord);
  const tracked = useRef(false);

  const [step, setStep] = useState(0);
  const [tutorName, setTutorName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("São Paulo");
  const [pet, setPet] = useState<NewPetInput>(initialPet);
  const [careType, setCareType] = useState<HealthRecordType | null>(null);
  const [careTitle, setCareTitle] = useState("");
  const [careDate, setCareDate] = useState(todayKey());
  const [nextDueDate, setNextDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const ageLabel = useMemo(
    () => (pet.birthDate ? petAge(pet.birthDate)?.label : null),
    [pet.birthDate],
  );

  useEffect(() => {
    if (ready && hasTutor) router.replace("/");
  }, [ready, hasTutor, router]);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    useAppStore.getState().track("onboarding_started");
  }, []);

  function validateCurrentStep() {
    if (step === 0 && tutorName.trim().length === 0) {
      setError("Como podemos te chamar?");
      return false;
    }
    if (step === 1 && pet.name.trim().length === 0) {
      setError("Dê um nome para seu pet para continuar.");
      return false;
    }
    if (step === 2) {
      const weight = pet.weightKg;
      if (
        weight !== null &&
        (typeof weight !== "number" || Number.isNaN(weight) || weight <= 0)
      ) {
        setError("Informe o peso em quilos, por exemplo 12,4.");
        return false;
      }
      if (pet.birthDate && pet.birthDate > todayKey()) {
        setError("A data de nascimento não pode estar no futuro.");
        return false;
      }
    }
    if (step === 3 && careType && careDate.length === 0) {
      setError("Escolha a data em que esse cuidado aconteceu.");
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

  function finish() {
    if (!validateCurrentStep() || saving) return;
    setSaving(true);
    try {
      completeOnboarding({
        tutorName: tutorName.trim(),
        email: email.trim() || null,
        city: city.trim() || "São Paulo",
        focusAreas: ["saude", "rotina"],
        pet: {
          ...pet,
          name: pet.name.trim(),
          breed: pet.breed?.trim() || null,
          birthDate: pet.birthDate || null,
          weightKg: pet.weightKg ?? null,
        },
      });

      const petId = useAppStore.getState().activePetId;
      if (petId && careType) {
        const metadata = healthTypeMeta[careType];
        addRecord({
          petId,
          type: careType,
          title: careTitle.trim() || metadata.label,
          date: careDate || todayKey(),
          nextDueDate: nextDueDate || null,
          leadDays: nextDueDate ? metadata.defaultLeadDays : 0,
          recurrenceMonths: null,
          professional: null,
          notes: null,
          attachmentName: null,
          attachmentData: null,
          weightKg: careType === "peso" ? (pet.weightKg ?? null) : null,
        });
      }
      router.replace("/");
    } catch {
      setError(
        "Não foi possível salvar neste aparelho. Seus dados continuam aqui para você tentar novamente.",
      );
      setSaving(false);
    }
  }

  function setOptionalPetField<K extends keyof NewPetInput>(
    key: K,
    value: NewPetInput[K],
  ) {
    setPet((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  if (!ready) return <SkeletonScreen label="Abrindo seu cadastro" />;

  return (
    <main className="min-h-dvh bg-canvas">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-8 pt-5 sm:px-8 lg:py-8">
        <header className="flex items-center gap-3">
          <ButtonLink
            href="/welcome"
            variant="ghost"
            size="icon"
            aria-label="Voltar para o início"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </ButtonLink>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <p className="text-meta font-semibold text-blue-deep">
                Criar seu espaço
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
          <div className="mb-8">
            <p className="inline-flex rotate-[-1deg] rounded-md bg-sun px-2.5 py-1 text-meta font-extrabold uppercase tracking-[0.12em] text-ink">
              Só o necessário agora
            </p>
            <h1 className="mt-2 font-editorial text-[clamp(2rem,8vw,3.25rem)] font-semibold leading-tight tracking-[-0.03em] text-ink">
              {step === 0 ? "Vamos começar pelo seu nome." : null}
              {step === 1 ? "Quem você cuida todos os dias?" : null}
              {step === 2 ? "Um pouco mais sobre ele." : null}
              {step === 3 ? "Quer guardar um cuidado real?" : null}
            </h1>
            <p className="mt-3 max-w-[42ch] text-[0.98rem] leading-relaxed text-ink-soft">
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
                    autoFocus
                    autoComplete="name"
                    value={tutorName}
                    onChange={(event) => {
                      setTutorName(event.target.value);
                      setError(null);
                    }}
                    placeholder="Como podemos te chamar?"
                    maxLength={60}
                    required
                  />
                </Field>
                <details className="group rounded-3xl border border-line bg-white p-4 open:shadow-card">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[0.95rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    <span>Adicionar detalhes opcionais</span>
                    <span className="text-meta font-medium text-teal-ink group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
                    <Field
                      label="E-mail"
                      htmlFor="tutor-email"
                      hint="Só para você recuperar o espaço depois"
                    >
                      <Input
                        id="tutor-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="voce@email.com"
                        maxLength={120}
                      />
                    </Field>
                    <Field
                      label="Cidade"
                      htmlFor="tutor-city"
                      hint="Você pode ajustar isso no perfil"
                    >
                      <Input
                        id="tutor-city"
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
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
                  className="w-full shadow-[3px_3px_0_var(--color-ink)]"
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
                    autoFocus
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
                  <legend className="text-[0.85rem] font-semibold text-ink">
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
                            "flex min-h-24 flex-col items-center justify-center gap-2 rounded-3xl border px-3 text-[0.9rem] font-semibold transition-[background-color,border-color,box-shadow] duration-150",
                            selected
                              ? "border-blue bg-blue-soft text-blue-deep shadow-[3px_3px_0_var(--color-sun)]"
                              : "border-line bg-white text-ink-soft hover:bg-surface",
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
                  className="w-full shadow-[3px_3px_0_var(--color-ink)]"
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
                    className="rounded-2xl bg-accent-soft px-3 py-2 text-meta font-medium text-danger-ink"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Raça" htmlFor="pet-breed" hint="Opcional">
                    <Input
                      id="pet-breed"
                      autoFocus
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
                    value={
                      pet.weightKg === null
                        ? ""
                        : String(pet.weightKg).replace(".", ",")
                    }
                    onChange={(event) => {
                      const raw = event.target.value.replace(",", ".");
                      setOptionalPetField(
                        "weightKg",
                        raw === "" ? null : Number(raw),
                      );
                    }}
                    placeholder="12,4"
                  />
                </Field>
                <div className="flex items-start gap-3 rounded-[1.5rem_1.5rem_2.5rem_1.5rem] border border-blue/15 bg-blue-soft p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-sun text-ink">
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
                  className="w-full shadow-[3px_3px_0_var(--color-ink)]"
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
                  className="mb-4 rounded-2xl bg-accent-soft px-3 py-2 text-meta font-medium text-danger-ink"
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
                          setCareType(selected ? null : choice.type);
                          setCareTitle("");
                          setError(null);
                        }}
                        className={cn(
                          "flex min-h-28 flex-col items-start justify-between rounded-3xl border p-4 text-left transition-[background-color,border-color,box-shadow] duration-150",
                          selected
                            ? "border-blue bg-blue-soft text-blue-deep shadow-[3px_3px_0_var(--color-sun)]"
                            : "border-line bg-white text-ink-soft hover:bg-surface",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-2xl",
                            selected
                              ? "bg-white text-teal-ink"
                              : "bg-surface text-ink-soft",
                          )}
                        >
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <span>
                          <span className="block text-[0.95rem] font-semibold">
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
                      autoFocus
                      value={careTitle}
                      onChange={(event) => setCareTitle(event.target.value)}
                      placeholder={healthTypeMeta[careType].label}
                      maxLength={80}
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Quando aconteceu?" htmlFor="care-date">
                      <Input
                        id="care-date"
                        type="date"
                        value={careDate}
                        max={todayKey()}
                        onChange={(event) => setCareDate(event.target.value)}
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
                        type="date"
                        min={careDate || todayKey()}
                        value={nextDueDate}
                        onChange={(event) => setNextDueDate(event.target.value)}
                      />
                    </Field>
                  </div>
                  <p className="flex items-start gap-2 rounded-2xl bg-mint/60 px-3 py-2.5 text-meta leading-relaxed text-teal-ink">
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
                    className="w-full shadow-[3px_3px_0_var(--color-ink)]"
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
                    className="w-full shadow-[3px_3px_0_var(--color-ink)]"
                    onClick={finish}
                    disabled={saving}
                  >
                    {saving ? "Salvando…" : "Criar meu espaço"}
                    <ArrowRight aria-hidden="true" className="size-5" />
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={finish}
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
