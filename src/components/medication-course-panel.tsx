"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  MedicationPlanFields,
  medicationPlanDraft,
  medicationPlanDraftSchema,
  parseMedicationPlanDraft,
} from "@/components/medication-plan-fields";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-sheet";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  formatDateTimeShort,
  formatShortDate,
  shiftDays,
} from "@/lib/domain/dates";
import {
  activeMedicationSchedule,
  medicationClock,
  medicationDayOccurrences,
  medicationDoseStatusLabels,
  nextMedicationOccurrence,
  type MedicationOccurrence,
} from "@/lib/domain/medication";
import type { HealthRecord, MedicationDoseStatus } from "@/lib/domain/schema";
import { useAppStore } from "@/lib/store/app-store";
import { useCurrentTime } from "@/lib/use-current-time";
import { useFormDraft } from "@/lib/use-form-draft";

function PlanEditor({
  record,
  onClose,
}: {
  record: HealthRecord;
  onClose: () => void;
}) {
  const course = record.medication!;
  const plan =
    activeMedicationSchedule(course) ??
    course.schedules[course.schedules.length - 1];
  const [expectedId] = useState(course.activeScheduleId);
  const initialValue = useMemo(() => medicationPlanDraft(plan), [plan]);
  const { value, setValue, clearDraft, ready, restored, storageError } =
    useFormDraft({
      key: `medication-plan:${record.id}:${expectedId ?? "ended"}`,
      schema: medicationPlanDraftSchema,
      initialValue,
    });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !ready) return;
    setPending(true);
    setError(null);
    try {
      await useAppStore
        .getState()
        .reviseMedicationPlan(
          record.id,
          expectedId,
          parseMedicationPlanDraft(value),
        );
      clearDraft();
      onClose();
      toast.success("Plano salvo; histórico preservado");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar o plano.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <p className="text-meta text-muted">
        As alterações valem para horários após o salvamento. Doses anteriores
        continuam com o plano que estava em vigor.
      </p>
      {restored ? (
        <p role="status" className="text-meta text-teal-ink">
          Rascunho do plano recuperado.
        </p>
      ) : null}
      {storageError ? (
        <p role="status" className="text-meta text-danger-ink">
          {storageError}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger-ink">
          {error}
        </p>
      ) : null}
      <MedicationPlanFields
        value={value}
        onChange={setValue}
        prefix="edit-medication"
      />
      <Button type="submit" disabled={pending || !ready}>
        {pending
          ? "Salvando…"
          : expectedId
            ? "Salvar plano"
            : "Iniciar novo plano"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          clearDraft();
          onClose();
        }}
      >
        Cancelar edição
      </Button>
    </form>
  );
}

function DoseRow({
  recordId,
  occurrence,
  now,
}: {
  recordId: string;
  occurrence: MedicationOccurrence;
  now: Date;
}) {
  const { schedule, date, time, event } = occurrence;
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<MedicationDoseStatus>(
    event?.status ?? "given",
  );
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clock = medicationClock(schedule.timeZone, now);
  const future = `${date}T${time}` > `${clock.date}T${clock.time}`;
  const recorded = event && event.status !== "unrecorded";
  async function save(nextStatus: MedicationDoseStatus) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await useAppStore
        .getState()
        .recordMedicationDose(recordId, {
          scheduleId: schedule.id,
          date,
          time,
          status: nextStatus,
          expectedEventId: event?.id ?? null,
          note,
        });
      setEditing(false);
      setNote("");
      toast.success("Registro de dose salvo");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível registrar a dose.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <li className="flex flex-col gap-2 rounded-card border border-line p-3">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="font-semibold text-ink">
          {time} · {schedule.amount} {schedule.unit}
        </p>
        <span className="text-meta font-semibold text-muted">
          {future
            ? "Planejada"
            : event?.status === "given" && event.recordedBy
              ? `Dada por ${event.recordedBy}`
              : medicationDoseStatusLabels[event?.status ?? "unrecorded"]}
        </span>
      </div>
      <p className="break-words text-meta text-muted">
        {schedule.timeZone} · {schedule.source}
      </p>
      {event?.note ? (
        <p className="text-meta text-ink-soft">{event.note}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger-ink">
          {error}
        </p>
      ) : null}
      {!future && !recorded && !editing ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => void save("given")}
          >
            Dose dada
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              setStatus("skipped");
              setEditing(true);
            }}
          >
            Registrar não dada
          </Button>
        </div>
      ) : null}
      {!future && recorded && !editing ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setStatus(event.status);
            setEditing(true);
          }}
        >
          Corrigir registro das {time}
        </Button>
      ) : null}
      {editing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save(status);
          }}
        >
          <Field
            label={`Situação da dose das ${time}`}
            htmlFor={`dose-status-${schedule.id}-${time}`}
          >
            <Select
              id={`dose-status-${schedule.id}-${time}`}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as MedicationDoseStatus)
              }
            >
              <option value="given">Dada</option>
              <option value="skipped">Pulada por decisão do responsável</option>
              <option value="missed">Não dada / horário perdido</option>
              {event ? (
                <option value="unrecorded">Voltar para sem confirmação</option>
              ) : null}
            </Select>
          </Field>
          <Field
            label="Observação sobre este registro"
            htmlFor={`dose-note-${schedule.id}-${time}`}
            hint="Opcional; a correção mantém o registro anterior no histórico"
          >
            <Textarea
              id={`dose-note-${schedule.id}-${time}`}
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar situação da dose"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => setEditing(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : null}
    </li>
  );
}

export function MedicationCoursePanel({ record }: { record: HealthRecord }) {
  const course = record.medication!;
  const active = activeMedicationSchedule(course);
  const last = active ?? course.schedules[course.schedules.length - 1];
  const now = useCurrentTime();
  const today = medicationClock(last.timeZone, now).date;
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const date = pickedDate ?? today;
  const [editing, setEditing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [confirm, confirmSheet] = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [historyLimit, setHistoryLimit] = useState(20);
  const occurrences = medicationDayOccurrences(course, date);
  const next = nextMedicationOccurrence(course, now);
  const history = [...course.events].reverse();
  return (
    <Card className="flex flex-col gap-4" id="medication-course">
      {confirmSheet}
      <h2 className="text-lg font-bold text-ink">Plano e doses</h2>
      <div className="rounded-card bg-mint/60 p-3">
        <p className="font-semibold text-teal-ink">
          {active
            ? `${active.amount} ${active.unit} · ${active.times.join(", ")}`
            : "Plano encerrado"}
        </p>
        <p className="mt-1 text-meta text-ink-soft">
          {last.everyDays === 1
            ? "Todos os dias"
            : `A cada ${last.everyDays} dias de calendário`}{" "}
          · {last.timeZone}
        </p>
        <p className="mt-1 text-meta text-ink-soft">
          De {formatShortDate(last.startsOn)}{" "}
          {last.endsOn
            ? `até ${formatShortDate(last.endsOn)}`
            : "· sem último dia informado"}
        </p>
        <p className="mt-1 break-words text-meta text-ink-soft">
          Origem: {last.source}
        </p>
        {last.instructions ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
            {last.instructions}
          </p>
        ) : null}
        <p className="mt-2 text-sm font-semibold text-ink">
          {next
            ? `Próximo horário sem confirmação: ${formatShortDate(next.date)} às ${next.time}.`
            : active
              ? "Não há novos horários neste plano. Confira os dias anteriores no histórico."
              : "Nenhuma nova dose é agendada. O histórico continua disponível."}
        </p>
      </div>
      <p className="text-meta text-muted">
        Avisos aparecem dentro da Zelupi. Uma dose só fica dada, pulada ou não
        dada quando você registra. Horários anteriores sem registro continuam
        sem confirmação.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-danger-ink">
          {error}
        </p>
      ) : null}
      {editing ? (
        <PlanEditor record={record} onClose={() => setEditing(false)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={ending}
            onClick={() => setEditing(true)}
          >
            {active ? "Editar plano" : "Iniciar novo plano"}
          </Button>
          {active ? (
            <Button
              variant="danger"
              disabled={ending}
              onClick={async () => {
                const confirmed = await confirm({
                  title: "Encerrar este plano?",
                  description:
                    "Os próximos horários deixam de aparecer. As doses já registradas continuam no histórico.",
                  confirmLabel: "Encerrar plano",
                });
                if (!confirmed) return;
                setEnding(true);
                setError(null);
                try {
                  await useAppStore
                    .getState()
                    .endMedicationPlan(record.id, active.id);
                  toast.success("Plano encerrado; histórico preservado");
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Não foi possível encerrar.",
                  );
                } finally {
                  setEnding(false);
                }
              }}
            >
              {ending ? "Salvando…" : "Encerrar plano"}
            </Button>
          ) : null}
        </div>
      )}
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <h3 className="font-bold text-ink">Doses por dia</h3>
        <Field label="Consultar dia" htmlFor={`medication-day-${record.id}`}>
          <Input
            id={`medication-day-${record.id}`}
            type="date"
            value={date}
            onChange={(e) => setPickedDate(e.target.value || null)}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPickedDate(shiftDays(date, -1))}
          >
            Dia anterior
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPickedDate(null)}
          >
            Hoje
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPickedDate(shiftDays(date, 1))}
          >
            Dia seguinte
          </Button>
        </div>
        {occurrences.length ? (
          <ul className="flex flex-col gap-3">
            {occurrences.map((occurrence) => (
              <DoseRow
                key={`${occurrence.schedule.id}:${occurrence.date}:${occurrence.time}:${occurrence.event?.id ?? "pending"}`}
                recordId={record.id}
                occurrence={occurrence}
                now={now}
              />
            ))}
          </ul>
        ) : (
          <p className="text-meta text-muted">
            Nenhuma dose planejada para este dia.
          </p>
        )}
      </div>
      <details className="border-t border-line pt-3">
        <summary className="cursor-pointer py-2 font-semibold text-ink">
          Histórico de registros e correções ({history.length})
        </summary>
        {!history.length ? (
          <p className="text-meta text-muted">Nenhuma dose confirmada ainda.</p>
        ) : (
          <ol className="flex flex-col gap-3 pt-2">
            {history.slice(0, historyLimit).map((event) => {
              const plan = course.schedules.find(
                (entry) => entry.id === event.scheduleId,
              )!;
              return (
                <li
                  key={event.id}
                  className="border-b border-line pb-2 text-meta text-ink-soft"
                >
                  <p className="font-semibold">
                    {formatShortDate(event.date)} às {event.time} ·{" "}
                    {medicationDoseStatusLabels[event.status]}
                  </p>
                  <p>
                    {plan.amount} {plan.unit} · {plan.timeZone}
                  </p>
                  <p>
                    {event.correctsId ? "Correção registrada" : "Registrado"} em{" "}
                    {formatDateTimeShort(event.recordedAt)}
                  </p>
                  {event.note ? <p>{event.note}</p> : null}
                </li>
              );
            })}
          </ol>
        )}
        {history.length > historyLimit ? (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setHistoryLimit((limit) => limit + 20)}
          >
            Ver mais registros
          </Button>
        ) : null}
      </details>
      {course.schedules.length > 1 ? (
        <details className="border-t border-line pt-3">
          <summary className="cursor-pointer py-2 font-semibold text-ink">
            Versões anteriores do plano
          </summary>
          <ul className="flex flex-col gap-3">
            {course.schedules
              .filter((plan) => plan.id !== active?.id)
              .map((plan) => (
                <li key={plan.id} className="text-meta text-ink-soft">
                  <p className="font-semibold">
                    {plan.amount} {plan.unit} · {plan.times.join(", ")} · a cada{" "}
                    {plan.everyDays} dia(s)
                  </p>
                  <p>
                    {plan.timeZone} · origem: {plan.source}
                  </p>
                  <p>Encerrada em {formatDateTimeShort(plan.closedAt!)}</p>
                  {plan.instructions ? <p>{plan.instructions}</p> : null}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
