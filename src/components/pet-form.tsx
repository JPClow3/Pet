"use client";

import { Cat, ChevronDown, Dog, LoaderCircle, PawPrint } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { z } from "zod";

import { PhotoPicker } from "@/components/photo-picker";
import { Button } from "@/components/ui/button";
import {
  CheckboxRow,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { sexLabels, sizeLabels, speciesLabels } from "@/lib/domain/labels";
import { isValidDateKey, todayKey } from "@/lib/domain/dates";
import { petSize } from "@/lib/domain/pet";
import { routineTagLabels, ROUTINE_TAGS } from "@/lib/domain/products";
import type { Pet, Sex, Species } from "@/lib/domain/schema";
import type { NewPetInput } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { useFormDraft } from "@/lib/use-form-draft";

const petDraftSchema = z.object({
  name: z.string().max(60),
  species: z.enum(["cao", "gato", "outro"]),
  sex: z.enum(["macho", "femea", "nao_informado"]),
  birthDate: z.string().max(10),
  breed: z.string().max(60),
  weight: z.string().max(40),
  color: z.string().max(40),
  microchip: z.string().max(40),
  notes: z.string().max(600),
  routine: z.array(z.string().max(40)).max(12),
});

const speciesOptions: { value: Species; icon: typeof Dog; hint: string }[] = [
  { value: "cao", icon: Dog, hint: "Cães" },
  { value: "gato", icon: Cat, hint: "Gatos" },
  { value: "outro", icon: PawPrint, hint: "Outro animal" },
];

const sexOptions: Sex[] = ["macho", "femea", "nao_informado"];

export type PetFormValues = NewPetInput;

export function PetForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Pet;
  submitLabel: string;
  onSubmit: (values: PetFormValues) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const initialDraft = useMemo(
    () => ({
      name: initial?.name ?? "",
      species: initial?.species ?? ("cao" as Species),
      sex: initial?.sex ?? ("nao_informado" as Sex),
      birthDate: initial?.birthDate ?? "",
      breed: initial?.breed ?? "",
      weight: initial?.weightKg ? String(initial.weightKg) : "",
      color: initial?.color ?? "",
      microchip: initial?.microchip ?? "",
      notes: initial?.notes ?? "",
      routine: initial?.routine ?? [],
    }),
    [initial],
  );
  const draft = useFormDraft({
    key: `pet:${initial?.id ?? "new"}:${initial?.updatedAt ?? "new"}`,
    schema: petDraftSchema,
    initialValue: initialDraft,
  });
  const {
    name,
    species,
    sex,
    birthDate,
    breed,
    weight,
    color,
    microchip,
    notes,
    routine,
  } = draft.value;
  function setField<K extends keyof typeof initialDraft>(
    key: K,
    value: (typeof initialDraft)[K],
  ) {
    draft.setValue((current) => ({ ...current, [key]: value }));
  }
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(initial));

  const parsedWeight =
    weight.trim() === "" ? null : Number(weight.replace(",", "."));
  const size =
    parsedWeight && Number.isFinite(parsedWeight) && parsedWeight <= 120
      ? petSize(species, parsedWeight)
      : null;
  const today = todayKey();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (name.trim().length === 0) {
      setError("Como você chama seu pet?");
      return;
    }
    if (
      parsedWeight !== null &&
      (!Number.isFinite(parsedWeight) ||
        parsedWeight <= 0 ||
        parsedWeight > 120)
    ) {
      setDetailsOpen(true);
      setError(
        "Informe um peso maior que zero e de até 120 kg, por exemplo 12,4.",
      );
      return;
    }
    if (birthDate && (!isValidDateKey(birthDate) || birthDate > today)) {
      setDetailsOpen(true);
      setError("Informe uma data de nascimento válida, até hoje.");
      return;
    }
    setError(null);
    submitting.current = true;
    setPending(true);
    try {
      await onSubmit({
        name: name.trim(),
        species,
        sex,
        birthDate: birthDate || null,
        breed: breed.trim() || null,
        weightKg: parsedWeight,
        photo,
        color: color.trim() || null,
        microchip: microchip.trim() || null,
        notes: notes.trim() || null,
        routine,
      });
      draft.clearDraft();
    } catch {
      setError(
        "Não foi possível salvar o perfil. Seus dados continuam preenchidos.",
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <fieldset disabled={pending} className="contents">
        {draft.restored || draft.storageError ? (
          <p
            role="status"
            className="rounded-2xl border border-line bg-surface px-4 py-3 text-meta text-ink-soft"
          >
            {draft.storageError ??
              "Rascunho recuperado nesta aba. Se havia uma nova foto, selecione-a novamente."}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 border-b border-line/80 pb-5">
          <p className="text-[1rem] font-semibold text-ink">
            {initial ? "Atualize o que mudou" : "Comece pelo essencial"}
          </p>
          <p className="text-[0.92rem] leading-relaxed text-muted">
            Nome e espécie bastam para começar. O restante é opcional e pode ser
            completado depois.
          </p>
          <PhotoPicker
            photo={photo}
            name={name || "seu pet"}
            onChange={setPhoto}
          />
        </div>

        {error ? (
          <p
            id="pet-form-error"
            role="alert"
            className="rounded-[14px] bg-danger/10 px-3 py-2 text-[0.85rem] font-semibold text-danger-ink"
          >
            {error}
          </p>
        ) : null}

        <Field label="Nome do pet" htmlFor="pet-name">
          <Input
            id="pet-name"
            value={name}
            onChange={(event) => {
              setField("name", event.target.value);
              if (error) setError(null);
            }}
            placeholder="Luna"
            maxLength={60}
            autoComplete="off"
            aria-describedby={error ? "pet-form-error" : undefined}
            aria-invalid={Boolean(error && name.trim().length === 0)}
            required
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[0.85rem] font-semibold text-ink">
            Espécie
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {speciesOptions.map((option) => {
              const Icon = option.icon;
              const selected = species === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setField("species", option.value)}
                  className={cn(
                    "flex min-h-20 flex-col items-center justify-center gap-1 rounded-[18px] border px-2 text-center text-[0.85rem] font-semibold transition-[background-color,border-color,transform] active:scale-[0.98]",
                    selected
                      ? "border-teal-ink bg-mint text-teal-ink"
                      : "border-line bg-paper text-ink-soft hover:bg-surface",
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  <span>{speciesLabels[option.value]}</span>
                  <span className="text-meta font-normal text-muted">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <details
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
          className="group rounded-[18px] border border-line/80 bg-surface/45"
        >
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[0.9rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <span>
              Adicionar mais detalhes{" "}
              <span className="font-normal text-muted">(opcional)</span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="flex flex-col gap-5 border-t border-line/70 px-4 pb-4 pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Sexo" htmlFor="pet-sex">
                <Select
                  id="pet-sex"
                  value={sex}
                  onChange={(event) =>
                    setField("sex", event.target.value as Sex)
                  }
                >
                  {sexOptions.map((option) => (
                    <option key={option} value={option}>
                      {sexLabels[option]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Nascimento"
                htmlFor="pet-birth"
                hint="Pode ser aproximada"
              >
                <Input
                  id="pet-birth"
                  type="date"
                  max={today}
                  value={birthDate ?? ""}
                  onChange={(event) =>
                    setField("birthDate", event.target.value)
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Raça" htmlFor="pet-breed" hint="Opcional">
                <Input
                  id="pet-breed"
                  value={breed}
                  onChange={(event) => setField("breed", event.target.value)}
                  placeholder="Sem raça definida"
                  maxLength={60}
                />
              </Field>
              <Field
                label="Peso"
                htmlFor="pet-weight"
                hint={
                  size ? `Porte ${sizeLabels[size].toLowerCase()}` : "Em quilos"
                }
              >
                <Input
                  id="pet-weight"
                  inputMode="decimal"
                  value={weight}
                  onChange={(event) => setField("weight", event.target.value)}
                  placeholder="12,4"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Cor" htmlFor="pet-color" hint="Ajuda a identificar">
                <Input
                  id="pet-color"
                  value={color}
                  onChange={(event) => setField("color", event.target.value)}
                  placeholder="Dourado"
                  maxLength={40}
                />
              </Field>
              <Field label="Microchip" htmlFor="pet-chip" hint="Se já tiver">
                <Input
                  id="pet-chip"
                  value={microchip}
                  onChange={(event) =>
                    setField("microchip", event.target.value)
                  }
                  maxLength={40}
                  inputMode="numeric"
                />
              </Field>
            </div>

            <fieldset className="flex flex-col gap-1">
              <legend className="text-[0.85rem] font-semibold text-ink">
                Rotina
              </legend>
              <p className="text-meta text-muted">
                Isso ajuda a explicar recomendações de lugares e produtos.
              </p>
              {ROUTINE_TAGS.map((tag) => (
                <CheckboxRow
                  key={tag}
                  id={`routine-${tag}`}
                  label={routineTagLabels[tag]}
                  checked={routine.includes(tag)}
                  onChange={(checked) =>
                    setField(
                      "routine",
                      checked
                        ? [...routine, tag]
                        : routine.filter((item) => item !== tag),
                    )
                  }
                />
              ))}
            </fieldset>

            <Field
              label="Observações"
              htmlFor="pet-notes"
              hint="Alergias, medos, preferências"
            >
              <Textarea
                id="pet-notes"
                value={notes}
                onChange={(event) => setField("notes", event.target.value)}
                maxLength={600}
                placeholder="Tem medo de fogos e não gosta de colo."
              />
            </Field>
          </div>
        </details>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" size="lg" className="flex-1" disabled={pending}>
            {pending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            ) : null}
            {pending ? "Salvando…" : submitLabel}
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="sm:flex-none"
              onClick={() => {
                draft.clearDraft();
                onCancel();
              }}
              disabled={pending}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
        <p className="text-center text-meta text-muted" aria-live="polite">
          {pending
            ? "Salvando neste aparelho…"
            : "Você poderá editar o perfil quando quiser."}
        </p>
      </fieldset>
    </form>
  );
}
