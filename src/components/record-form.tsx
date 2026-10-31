"use client";

import { ChevronDown, LoaderCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { z } from "zod";

import { PhotoPicker } from "@/components/photo-picker";
import {
  MedicationPlanFields,
  medicationPlanDraft,
  medicationPlanDraftSchema,
  parseMedicationPlanDraft,
} from "@/components/medication-plan-fields";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { addMonthsToKey, isValidDateKey, todayKey } from "@/lib/domain/dates";
import { HEALTH_TYPES, healthTypeMeta } from "@/lib/domain/labels";
import { healthTypeIcons } from "@/lib/icons";
import type { HealthRecord, HealthRecordType } from "@/lib/domain/schema";
import type { NewRecordInput } from "@/lib/store/app-store";
import { useFormDraft } from "@/lib/use-form-draft";
import { healthRecordTypeSchema } from "@/lib/domain/schema";
import { createMedicationCourse } from "@/lib/domain/medication";
import { newId } from "@/lib/id";
import { cn } from "@/lib/utils";

const leadOptions = [
  { value: 3, label: "3 dias antes" },
  { value: 7, label: "7 dias antes" },
  { value: 15, label: "15 dias antes" },
  { value: 30, label: "30 dias antes" },
  { value: 60, label: "60 dias antes" },
];

const recurrenceOptions = [
  { value: 0, label: "Não repetir" },
  { value: 1, label: "Todo mês" },
  { value: 3, label: "A cada 3 meses" },
  { value: 6, label: "A cada 6 meses" },
  { value: 12, label: "Todo ano" },
];

// Preventive care is the core promise: the reminder starts on, at the usual interval.
const PREVENTIVE_TYPES: HealthRecordType[] = [
  "vacina",
  "vermifugo",
  "antiparasitario",
];

// Placeholders read as examples, never as a pre-filled answer.
const titleExamples: Record<HealthRecordType, string> = {
  vacina: "V10, antirrábica",
  vermifugo: "Drontal",
  antiparasitario: "Bravecto, coleira",
  medicamento: "Antibiótico por 7 dias",
  consulta: "Retorno, check-up anual",
  exame: "Hemograma",
  peso: "Pesagem mensal",
  observacao: "Comeu pouco hoje",
};

function dueDefaults(type: HealthRecordType, date: string) {
  const months = healthTypeMeta[type].defaultRecurrenceMonths;
  const suggested =
    PREVENTIVE_TYPES.includes(type) && months && isValidDateKey(date);
  return {
    hasDue: Boolean(suggested),
    nextDueDate: suggested ? addMonthsToKey(date, months) : "",
    recurrenceMonths: suggested ? months : 0,
    leadDays: healthTypeMeta[type].defaultLeadDays,
  };
}

const recordDraftSchema = z.object({
  type: healthRecordTypeSchema,
  title: z.string().max(80),
  date: z.string().max(10),
  hasDue: z.boolean(),
  nextDueDate: z.string().max(10),
  leadDays: z.number().int().min(0).max(365),
  recurrenceMonths: z.number().int().min(0).max(60),
  professional: z.string().max(80),
  manufacturer: z.string().max(80).optional().default(""),
  batchNumber: z.string().max(80).optional().default(""),
  notes: z.string().max(600),
  weight: z.string().max(30),
  medicationEnabled: z.boolean().default(false),
  medicationPlan: medicationPlanDraftSchema.optional(),
});

export function RecordForm({
  petId,
  petName,
  initial,
  initialType,
  submitLabel,
  onSubmit,
  onDelete,
  onCancel,
}: {
  petId: string;
  petName: string;
  initial?: HealthRecord;
  initialType?: HealthRecordType;
  submitLabel: string;
  onSubmit: (values: NewRecordInput) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onCancel?: () => void;
}) {
  const initialDraft = useMemo(() => {
    const startType = initial?.type ?? initialType ?? "vacina";
    const defaults = dueDefaults(startType, todayKey());
    return {
      type: startType,
      title: initial?.title ?? "",
      date: initial?.date ?? todayKey(),
      hasDue: initial ? Boolean(initial.nextDueDate) : defaults.hasDue,
      nextDueDate: initial ? (initial.nextDueDate ?? "") : defaults.nextDueDate,
      leadDays: initial?.leadDays ?? defaults.leadDays,
      recurrenceMonths: initial
        ? (initial.recurrenceMonths ?? 0)
        : defaults.recurrenceMonths,
      professional: initial?.professional ?? "",
      manufacturer: initial?.manufacturer ?? "",
      batchNumber: initial?.batchNumber ?? "",
      notes: initial?.notes ?? "",
      weight: initial?.weightKg ? String(initial.weightKg) : "",
      medicationEnabled: !initial && initialType === "medicamento",
      medicationPlan: medicationPlanDraft(),
    };
  }, [initial, initialType]);
  const { value, setValue, restored, storageError, ready, clearDraft } =
    useFormDraft({
      key: `record:${petId}:${initial?.id ?? initialType ?? "vacina"}`,
      schema: recordDraftSchema,
      initialValue: initialDraft,
    });
  const {
    type,
    title,
    date,
    hasDue,
    nextDueDate,
    leadDays,
    recurrenceMonths,
    professional,
    manufacturer,
    batchNumber,
    notes,
    weight,
  } = value;
  function setField<K extends keyof typeof value>(
    field: K,
    next: (typeof value)[K],
  ) {
    setValue((current) => ({ ...current, [field]: next }));
  }
  const setType = (next: HealthRecordType) => setField("type", next);
  const setTitle = (next: string) => setField("title", next);
  const setDate = (next: string) =>
    setValue((current) => {
      // Keep an untouched suggestion in step with the care date.
      const previous = dueDefaults(current.type, current.date);
      const following = dueDefaults(current.type, next);
      const untouched =
        current.hasDue && current.nextDueDate === previous.nextDueDate;
      return {
        ...current,
        date: next,
        nextDueDate:
          untouched && following.nextDueDate
            ? following.nextDueDate
            : current.nextDueDate,
      };
    });
  const setHasDue = (next: boolean) => setField("hasDue", next);
  const setNextDueDate = (next: string) => setField("nextDueDate", next);
  const setLeadDays = (next: number) => setField("leadDays", next);
  const setRecurrenceMonths = (next: number) =>
    setField("recurrenceMonths", next);
  const setProfessional = (next: string) => setField("professional", next);
  const setNotes = (next: string) => setField("notes", next);
  const setWeight = (next: string) => setField("weight", next);
  const [attachment, setAttachment] = useState<string | null>(
    initial?.attachmentData ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(initial));
  // The type was already chosen (picker or edit): show it once, with "Trocar".
  const [typePickerOpen, setTypePickerOpen] = useState(
    !initial && !initialType,
  );
  const typeLocked = Boolean(initial?.medication);

  const meta = healthTypeMeta[type];
  const TypeIcon = healthTypeIcons[type];
  const today = todayKey();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !ready) return;

    const finalTitle = title.trim() || meta.label;
    if (!isValidDateKey(date) || date > today) {
      setError("Informe uma data válida, até hoje, para o cuidado.");
      return;
    }
    const structuredMedication =
      type === "medicamento" &&
      (Boolean(initial?.medication) || value.medicationEnabled);
    if (!structuredMedication && hasDue && !isValidDateKey(nextDueDate)) {
      setError("Informe uma próxima data válida ou desmarque o aviso.");
      return;
    }
    if (!structuredMedication && hasDue && nextDueDate < date) {
      setError(
        "A próxima data precisa ser igual ou posterior ao cuidado registrado.",
      );
      return;
    }
    const parsedWeight =
      weight.trim() === "" ? null : Number(weight.replace(",", "."));
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
    if (type === "peso" && parsedWeight === null) {
      setError("Informe o peso em quilos para registrar a pesagem.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const medication =
        initial?.medication ??
        (structuredMedication
          ? createMedicationCourse(
              parseMedicationPlanDraft(
                value.medicationPlan ?? medicationPlanDraft(),
              ),
              newId("med-plan"),
            )
          : null);
      await onSubmit({
        petId,
        type,
        title: finalTitle,
        date,
        nextDueDate:
          !structuredMedication && hasDue && nextDueDate ? nextDueDate : null,
        leadDays: !structuredMedication && hasDue ? leadDays : 0,
        recurrenceMonths:
          !structuredMedication && hasDue && recurrenceMonths > 0
            ? recurrenceMonths
            : null,
        professional: professional.trim() || null,
        manufacturer: type === "vacina" ? (manufacturer.trim() || null) : null,
        batchNumber: type === "vacina" ? (batchNumber.trim() || null) : null,
        notes: notes.trim() || null,
        attachmentName: attachment ? `anexo-${type}.jpg` : null,
        attachmentData: attachment,
        weightKg: parsedWeight,
        medication,
      });
      clearDraft();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar. Seus dados continuam preenchidos para tentar novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-[640px] flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <p className="text-body font-semibold text-ink">
          Registrar cuidado para {petName}
        </p>
        <p className="text-body leading-relaxed text-muted">
          Salve o essencial agora. Os detalhes ficam disponíveis para editar
          depois.
        </p>
      </div>

      {error ? (
        <p
          id="record-form-error"
          role="alert"
          className="rounded-control bg-danger/10 px-3 py-2 text-label font-semibold text-danger-ink"
        >
          {error}
        </p>
      ) : null}
      {restored ? (
        <p role="status" className="text-meta text-teal-ink">
          Rascunho recuperado nesta aba. Anexe a foto novamente, se necessário.
        </p>
      ) : null}
      {storageError ? (
        <p role="status" className="text-meta text-danger-ink">
          {storageError}
        </p>
      ) : null}

      {!typePickerOpen ? (
        <div className="flex min-h-14 items-center justify-between gap-3 rounded-card border border-line bg-paper px-4">
          <span className="flex min-w-0 items-center gap-2.5 text-body font-semibold text-ink">
            <TypeIcon
              aria-hidden="true"
              className="size-5 shrink-0 text-teal-ink"
            />
            {meta.label}
          </span>
          {!typeLocked ? (
            <button
              type="button"
              onClick={() => setTypePickerOpen(true)}
              aria-label={`Trocar tipo de registro (atual: ${meta.label})`}
              className="inline-flex min-h-11 items-center px-2 text-label font-semibold text-teal-ink"
            >
              Trocar
            </button>
          ) : null}
        </div>
      ) : (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-label font-semibold text-ink">
          O que aconteceu com {petName}?
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {HEALTH_TYPES.map((item) => {
            const Icon = healthTypeIcons[item];
            const selected = type === item;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                disabled={
                  Boolean(initial?.medication) && item !== "medicamento"
                }
                onClick={() => {
                  setType(item);
                  const defaults = dueDefaults(item, date);
                  setLeadDays(defaults.leadDays);
                  setHasDue(defaults.hasDue);
                  setNextDueDate(defaults.nextDueDate);
                  setRecurrenceMonths(defaults.recurrenceMonths);
                  if (!initial)
                    setField("medicationEnabled", item === "medicamento");
                  if (!initial) setTitle("");
                  if (initialType || initial) setTypePickerOpen(false);
                }}
                className={cn(
                  "flex min-h-16 items-center gap-2 rounded-control border px-3 text-left text-label font-semibold transition-[background-color,border-color,transform] active:scale-[0.98] sm:min-h-20 sm:flex-col sm:items-start sm:justify-center sm:gap-1",
                  selected
                    ? "border-teal-ink bg-mint text-teal-ink"
                    : "border-line bg-paper text-ink-soft hover:bg-surface",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 sm:size-5"
                />
                {healthTypeMeta[item].label}
              </button>
            );
          })}
        </div>
      </fieldset>
      )}

      {type === "medicamento" ? (
        initial?.medication ? (
          <p className="text-meta text-muted">
            O plano e o histórico de doses são gerenciados acima. Estas
            alterações preservam todas as doses registradas.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                className="size-5 accent-teal-ink"
                checked={value.medicationEnabled}
                disabled={Boolean(initial?.completedAt)}
                onChange={(e) =>
                  setField("medicationEnabled", e.target.checked)
                }
              />
              Organizar doses conforme a prescrição
            </label>
            {initial?.completedAt ? (
              <div className="flex flex-col gap-2">
                <p className="text-meta text-muted">
                  Este ciclo já foi concluído. Para organizar novas doses, crie
                  outro registro.
                </p>
                <ButtonLink
                  size="sm"
                  variant="secondary"
                  href={`/pets/${petId}/health/new?type=medicamento`}
                >
                  Novo plano de medicação
                </ButtonLink>
              </div>
            ) : null}
            {value.medicationEnabled ? (
              <MedicationPlanFields
                value={value.medicationPlan ?? medicationPlanDraft()}
                onChange={(plan) => setField("medicationPlan", plan)}
              />
            ) : (
              <p className="text-meta text-muted">
                Registro simples, sem plano de doses. Você pode acrescentar o
                plano depois.
              </p>
            )}
          </div>
        )
      ) : null}

      <Field
        label="Nome do cuidado"
        htmlFor="record-title"
        hint="Opcional"
      >
        <Input
          id="record-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={`Ex.: ${titleExamples[type]}`}
          maxLength={80}
          aria-describedby={error ? "record-form-error" : undefined}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label={type === "vacina" ? "Quando foi aplicada?" : "Data do cuidado"}
          htmlFor="record-date"
          hint="Use a data da carteirinha ou da visita"
        >
          <Input
            id="record-date"
            type="date"
            required
            max={today}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>

        {type === "peso" ? (
          <Field label="Peso" htmlFor="record-weight" hint="Em quilos">
            <Input
              id="record-weight"
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="Ex.: 12,4"
            />
          </Field>
        ) : null}
      </div>

      {meta.hasDue &&
      !(
        type === "medicamento" &&
        (initial?.medication || value.medicationEnabled)
      ) ? (
        <fieldset className="flex flex-col gap-3 rounded-card border border-warning/40 bg-warning-soft/70 p-4">
          <legend className="px-1 text-label font-bold text-ink">
            Próximo cuidado
          </legend>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-teal-ink"
              checked={hasDue}
              onChange={(event) => {
                setHasDue(event.target.checked);
                setError(null);
              }}
            />
            <span className="text-body font-semibold text-ink">
              Quero um aviso antes da próxima data
            </span>
          </label>

          {hasDue ? (
            <>
              <Field
                label="Próxima data"
                htmlFor="record-due"
                hint="A data fica na agenda deste pet"
              >
                <Input
                  id="record-due"
                  type="date"
                  min={date}
                  value={nextDueDate}
                  onChange={(event) => setNextDueDate(event.target.value)}
                />
              </Field>
              <div className="flex flex-col gap-2">
                <span className="text-label font-semibold text-ink">
                  Quando avisar
                </span>
                <div className="flex flex-wrap gap-2">
                  {leadOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={leadDays === option.value}
                      onClick={() => setLeadDays(option.value)}
                      className={cn(
                        "min-h-11 rounded-full border px-3 text-label font-semibold transition-colors",
                        leadDays === option.value
                          ? "border-teal-ink bg-teal-ink text-white"
                          : "border-line bg-paper text-ink-soft hover:bg-surface",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-label font-semibold text-ink">
                  Repetir depois de concluir?
                </span>
                <div className="flex flex-wrap gap-2">
                  {recurrenceOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={recurrenceMonths === option.value}
                      onClick={() => setRecurrenceMonths(option.value)}
                      className={cn(
                        "min-h-11 rounded-full border px-3 text-label font-semibold transition-colors",
                        recurrenceMonths === option.value
                          ? "border-info-ink bg-info-ink text-white"
                          : "border-line bg-paper text-ink-soft hover:bg-surface",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-meta text-muted">
                  O próximo ciclo só é criado quando você marcar este cuidado
                  como feito.
                </p>
              </div>
            </>
          ) : null}
        </fieldset>
      ) : null}

      <details
        open={detailsOpen}
        onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        className="group rounded-card border border-line/80 bg-surface/45"
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-label font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <span>
            Adicionar detalhes{" "}
            <span className="font-normal text-muted">(opcional)</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-5 border-t border-line/70 px-4 pb-4 pt-4">
          {type !== "peso" ? (
            <Field
              label="Profissional ou local"
              htmlFor="record-professional"
              hint="Opcional"
            >
              <Input
                id="record-professional"
                value={professional}
                onChange={(event) => setProfessional(event.target.value)}
                placeholder="Dra. Marina"
                maxLength={80}
              />
            </Field>
          ) : null}

          {type === "vacina" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Fabricante da vacina"
                htmlFor="record-manufacturer"
                hint="Ex.: Zoetis, MSD, Boehringer"
              >
                <Input
                  id="record-manufacturer"
                  value={manufacturer}
                  onChange={(event) =>
                    setField("manufacturer", event.target.value)
                  }
                  placeholder="Zoetis"
                  maxLength={80}
                />
              </Field>
              <Field
                label="Lote / Partida"
                htmlFor="record-batch"
                hint="Identificação do frasco"
              >
                <Input
                  id="record-batch"
                  value={batchNumber}
                  onChange={(event) =>
                    setField("batchNumber", event.target.value)
                  }
                  placeholder="Ex.: 042/26"
                  maxLength={80}
                />
              </Field>
            </div>
          ) : null}

          <Field
            label="Observações"
            htmlFor="record-notes"
            hint="Dose informada, reação ou orientação recebida"
          >
            <Textarea
              id="record-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={600}
              placeholder="Reforço anual. Sem reação."
            />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-label font-semibold text-ink">Anexo</span>
            <PhotoPicker
              photo={attachment}
              name={title || meta.label}
              onChange={setAttachment}
            />
            <span className="text-meta text-muted">
              Foto da carteirinha, receita ou exame. Fica salvo só no seu
              aparelho.
            </span>
          </div>
        </div>
      </details>

      {initial ? (
        <p className="text-meta text-muted">
          Editando um registro de {initial.date.split("-").reverse().join("/")}.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={pending || !ready}
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
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
              clearDraft();
              onCancel();
            }}
            disabled={pending}
          >
            Cancelar
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            type="button"
            variant="danger"
            size="lg"
            className="sm:flex-none"
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                await onDelete();
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Não foi possível excluir.",
                );
              } finally {
                setPending(false);
              }
            }}
            disabled={pending}
          >
            Excluir
          </Button>
        ) : null}
      </div>
      <p className="text-center text-meta text-muted" aria-live="polite">
        {pending
          ? "Salvando neste aparelho…"
          : "Os registros ficam disponíveis para você editar depois."}
      </p>
    </form>
  );
}
