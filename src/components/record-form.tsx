"use client";

import { ChevronDown, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

import { PhotoPicker } from "@/components/photo-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { todayKey } from "@/lib/domain/dates";
import { HEALTH_TYPES, healthTypeMeta } from "@/lib/domain/labels";
import { healthTypeIcons } from "@/lib/icons";
import type { HealthRecord, HealthRecordType } from "@/lib/domain/schema";
import type { NewRecordInput } from "@/lib/store/app-store";
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

export function RecordForm({
  petName,
  initial,
  initialType,
  submitLabel,
  onSubmit,
  onDelete,
  onCancel,
}: {
  petName: string;
  initial?: HealthRecord;
  initialType?: HealthRecordType;
  submitLabel: string;
  onSubmit: (values: NewRecordInput) => void;
  onDelete?: () => void;
  onCancel?: () => void;
}) {
  const [type, setType] = useState<HealthRecordType>(
    initial?.type ?? initialType ?? "vacina",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? todayKey());
  const [hasDue, setHasDue] = useState(Boolean(initial?.nextDueDate));
  const [nextDueDate, setNextDueDate] = useState(initial?.nextDueDate ?? "");
  const [leadDays, setLeadDays] = useState(
    initial?.leadDays ??
      healthTypeMeta[initialType ?? "vacina"].defaultLeadDays,
  );
  const [recurrenceMonths, setRecurrenceMonths] = useState(
    initial?.recurrenceMonths ?? 0,
  );
  const [professional, setProfessional] = useState(initial?.professional ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [weight, setWeight] = useState(
    initial?.weightKg ? String(initial.weightKg) : "",
  );
  const [attachment, setAttachment] = useState<string | null>(
    initial?.attachmentData ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(initial));

  const meta = healthTypeMeta[type];
  const today = todayKey();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const finalTitle = title.trim() || meta.label;
    if (hasDue && !nextDueDate) {
      setError("Informe a próxima data ou desmarque o aviso.");
      return;
    }
    if (hasDue && nextDueDate < date) {
      setError(
        "A próxima data precisa ser igual ou posterior ao cuidado registrado.",
      );
      return;
    }
    const parsedWeight =
      weight.trim() === "" ? null : Number(weight.replace(",", "."));
    if (
      parsedWeight !== null &&
      (Number.isNaN(parsedWeight) || parsedWeight <= 0)
    ) {
      setDetailsOpen(true);
      setError("Informe o peso em quilos, por exemplo 12,4.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      onSubmit({
        petId: initial?.petId ?? "",
        type,
        title: finalTitle,
        date,
        nextDueDate: hasDue && nextDueDate ? nextDueDate : null,
        leadDays: hasDue ? leadDays : 0,
        recurrenceMonths:
          hasDue && recurrenceMonths > 0 ? recurrenceMonths : null,
        professional: professional.trim() || null,
        notes: notes.trim() || null,
        attachmentName: attachment ? `anexo-${type}.jpg` : null,
        attachmentData: attachment,
        weightKg: parsedWeight,
      });
    } catch {
      setPending(false);
      setError(
        "Não foi possível salvar. Seus dados continuam preenchidos para tentar novamente.",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-[640px] flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <p className="text-[1rem] font-semibold text-ink">
          Registrar cuidado para {petName}
        </p>
        <p className="text-[0.92rem] leading-relaxed text-muted">
          Salve o essencial agora. Os detalhes ficam disponíveis para editar
          depois.
        </p>
      </div>

      {error ? (
        <p
          id="record-form-error"
          role="alert"
          className="rounded-[14px] bg-danger/10 px-3 py-2 text-[0.85rem] font-semibold text-danger-ink"
        >
          {error}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[0.85rem] font-semibold text-ink">
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
                onClick={() => {
                  setType(item);
                  setLeadDays(healthTypeMeta[item].defaultLeadDays);
                  setHasDue(false);
                  setNextDueDate("");
                  setRecurrenceMonths(0);
                  if (!initial) setTitle("");
                }}
                className={cn(
                  "flex min-h-16 items-center gap-2 rounded-[16px] border px-3 text-left text-[0.85rem] font-semibold transition-[background-color,border-color,transform] active:scale-[0.98] sm:min-h-20 sm:flex-col sm:items-start sm:justify-center sm:gap-1",
                  selected
                    ? "border-teal-ink bg-mint text-teal-ink"
                    : "border-line bg-white text-ink-soft hover:bg-surface",
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

      {type === "medicamento" ? (
        <p className="rounded-[16px] border border-info-ink/25 bg-info-soft px-3 py-2 text-meta leading-relaxed text-info-ink">
          Este registro guarda o que você informou. A agenda não calcula dose,
          frequência ou segurança clínica automaticamente.
        </p>
      ) : null}

      <Field
        label="Nome do cuidado"
        htmlFor="record-title"
        hint="Ex.: Vacina V10, consulta de retorno, peso mensal"
      >
        <Input
          id="record-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={meta.label}
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
              placeholder="12,4"
            />
          </Field>
        ) : null}
      </div>

      {meta.hasDue ? (
        <fieldset className="flex flex-col gap-3 rounded-[20px] border border-warning/40 bg-warning-soft/70 p-4">
          <legend className="px-1 text-[0.85rem] font-bold text-ink">
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
            <span className="text-[0.95rem] font-semibold text-ink">
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
                <span className="text-[0.85rem] font-semibold text-ink">
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
                        "min-h-11 rounded-full border px-3 text-[0.85rem] font-semibold transition-colors",
                        leadDays === option.value
                          ? "border-teal-ink bg-teal-ink text-white"
                          : "border-line bg-white text-ink-soft hover:bg-surface",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[0.85rem] font-semibold text-ink">
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
                        "min-h-11 rounded-full border px-3 text-[0.85rem] font-semibold transition-colors",
                        recurrenceMonths === option.value
                          ? "border-info-ink bg-info-ink text-white"
                          : "border-line bg-white text-ink-soft hover:bg-surface",
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
        className="group rounded-[18px] border border-line/80 bg-surface/45"
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[0.9rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
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
          ) : (
            <Field
              label="Peso"
              htmlFor="record-weight-details"
              hint="Em quilos"
            >
              <Input
                id="record-weight-details"
                inputMode="decimal"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder="12,4"
              />
            </Field>
          )}

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
            <span className="text-[0.85rem] font-semibold text-ink">Anexo</span>
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
        <Button type="submit" size="lg" className="flex-1" disabled={pending}>
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
            onClick={onCancel}
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
            onClick={onDelete}
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
