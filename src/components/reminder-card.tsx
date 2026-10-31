"use client";

import {
  CalendarClock,
  Check,
  Clock,
  LoaderCircle,
  PawPrint,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { BottomSheet } from "@/components/ui/sheet";
import { ReminderForm } from "@/components/reminder-form";
import { AddToCalendarButton } from "@/components/add-to-calendar";
import {
  createCalendarEventFromReminder,
  type CalendarEvent,
} from "@/lib/calendar";
import {
  addMonthsToKey,
  formatShortDate,
  isValidDateKey,
  todayKey,
} from "@/lib/domain/dates";
import type { CareUndo } from "@/lib/domain/care";
import { urgencyLabels } from "@/lib/domain/labels";
import {
  latestDoseEvent,
  medication24HoursOccurrences,
} from "@/lib/domain/medication";
import {
  reminderAttentionText,
  SNOOZE_OPTIONS,
  type ReminderItem,
} from "@/lib/domain/reminders";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

const urgencyTone = {
  vencido: "danger",
  hoje: "warning",
  proximo: "teal",
  futuro: "muted",
} as const;

const urgencySurface = {
  vencido: "border-l-danger-ink",
  hoje: "border-l-warning-ink",
  proximo: "border-l-info-ink",
  futuro: "border-l-line",
} as const;

type Action = "complete" | "snooze" | "change" | null;

export function ReminderCard(props: { item: ReminderItem; showPet?: boolean }) {
  return props.item.medication ? (
    <MedicationReminderCard {...props} />
  ) : (
    <CareReminderCard {...props} />
  );
}

function MedicationReminderCard({
  item,
  showPet = true,
}: {
  item: ReminderItem;
  showPet?: boolean;
}) {
  const dose = item.medication!;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const record = useAppStore((state) =>
    state.records.find((entry) => entry.id === item.id),
  );

  const medEvent: CalendarEvent = useMemo(
    () => ({
      id: `zelupi-med-${item.id}-${dose.scheduleId}-${item.dueDate}-${dose.time}`,
      title: `Medicamento: ${item.title} (${item.petName}) — Zelupi`,
      description: `🐾 Pet: ${item.petName}\n💊 Dose de ${item.title}: ${dose.amount} ${dose.unit}\n🗓️ Horário: ${formatShortDate(item.dueDate)} às ${dose.time}\nFuso: ${dose.timeZone}\n${item.notes ? `Observações: ${item.notes}\n` : ""}\nOrganizado pelo Zelupi (https://zelupi.app)`,
      startDate: item.dueDate,
      startTime: dose.time,
      petName: item.petName,
      category: "medicamento",
      alarms: [
        { minutesBefore: 60, description: `Em 1h: Dar dose de ${item.title} para ${item.petName}` },
        { minutesBefore: 15, description: `Em 15 min: Dar dose de ${item.title} para ${item.petName}` },
      ],
    }),
    [item, dose],
  );

  const timelineDoses = useMemo(
    () =>
      record?.medication
        ? medication24HoursOccurrences(record.medication, new Date())
        : [],
    [record],
  );

  const currentEvent = useMemo(
    () =>
      record?.medication
        ? latestDoseEvent(record.medication, dose.scheduleId, item.dueDate, dose.time)
        : null,
    [record, dose.scheduleId, item.dueDate, dose.time],
  );

  async function giveDose(
    scheduleId: string,
    date: string,
    time: string,
    expectedEventId: string | null,
  ) {
    setPending(true);
    setError(null);
    try {
      const newEventId = await useAppStore
        .getState()
        .recordMedicationDose(item.id, {
          scheduleId,
          date,
          time,
          status: "given",
          expectedEventId,
        });

      toast.success(`Dose de ${item.title} dada`, {
        description: `${dose.amount} ${dose.unit} · ${formatShortDate(date)} às ${time}`,
        action: {
          label: "Desfazer",
          onClick: async () => {
            try {
              await useAppStore
                .getState()
                .recordMedicationDose(item.id, {
                  scheduleId,
                  date,
                  time,
                  status: "unrecorded",
                  expectedEventId: newEventId,
                });
              toast.success("Dose desfeita");
            } catch (cause) {
              toast.error(
                cause instanceof Error
                  ? cause.message
                  : "Não foi possível desfazer a dose.",
              );
            }
          },
        },
        duration: 7000,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a dose.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <article
      className="flex flex-col gap-3 rounded-card border border-line bg-paper p-4"
      data-urgency={item.urgency}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-ink">{item.title}</h3>
        <Chip tone={dose.due ? "warning" : "muted"}>
          {dose.due ? "Sem confirmação" : "Planejada"}
        </Chip>
      </div>
      <p className="text-sm text-ink-soft">
        {dose.amount} {dose.unit} · {formatShortDate(item.dueDate)} às{" "}
        {dose.time}
      </p>
      <p className="break-words text-meta text-muted">
        {showPet ? `${item.petName} · ` : ""}
        {dose.timeZone}
      </p>
      {item.notes ? (
        <p className="text-sm text-ink-soft">{item.notes}</p>
      ) : null}

      {/* Alerta anti-dupla dosagem e confirmação compartilhada */}
      {currentEvent?.status === "given" ? (
        <div className="flex items-center gap-2 rounded-xl border border-success-ink/30 bg-success-soft px-3 py-2 text-sm text-success-ink">
          <Check aria-hidden="true" className="size-4 shrink-0 text-success-ink" />
          <span className="leading-snug">
            Dose das <strong>{dose.time}</strong> já administrada
            {currentEvent.recordedBy ? (
              <> por <strong>{currentEvent.recordedBy}</strong></>
            ) : null}
            . Proteção ativa contra dose dupla!
          </span>
        </div>
      ) : null}

      {/* Mini-cronograma visual das Próximas 24 horas */}
      {timelineDoses.length > 0 ? (
        <section
          className="flex flex-col gap-2 rounded-control border border-line/70 bg-surface/40 p-3"
          aria-label="Mini-cronograma das próximas 24 horas"
        >
          <div className="flex items-center justify-between text-meta font-semibold text-muted">
            <span className="flex items-center gap-1.5">
              <Clock aria-hidden="true" className="size-3.5 text-teal-ink" />
              Próximas 24 horas
            </span>
            <span className="font-normal lowercase">
              {timelineDoses.filter((d) => d.event?.status === "given").length} de {timelineDoses.length} dadas
            </span>
          </div>

          <div
            className="flex flex-wrap gap-2 pt-0.5"
            role="list"
          >
            {timelineDoses.map((d) => {
              const isGiven = d.event?.status === "given";
              const isMissed = d.event?.status === "missed";
              const isSkipped = d.event?.status === "skipped";
              const isCurrentDue = d.due;
              const isTomorrow = d.date > todayKey();
              return (
                <div
                  key={`${d.schedule.id}-${d.date}-${d.time}`}
                  role="listitem"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-meta font-medium transition-colors",
                    isGiven
                      ? "border-success-ink/30 bg-success-soft text-success-ink"
                      : isMissed
                        ? "border-danger-ink/30 bg-danger-soft text-danger-ink"
                        : isSkipped
                          ? "border-line bg-surface text-muted"
                          : isCurrentDue
                            ? "border-warning-ink/40 bg-warning-soft text-ink font-semibold"
                            : "border-line bg-paper text-muted",
                  )}
                >
                  <span className="tabular-nums">
                    {isTomorrow ? `Amanhã ${d.time}` : d.time}
                  </span>
                  {isGiven ? (
                    <span className="inline-flex items-center gap-0.5 text-xs text-success-ink">
                      <Check aria-hidden="true" className="size-3.5" />
                      Dada{d.event?.recordedBy ? ` (${d.event.recordedBy})` : ""}
                    </span>
                  ) : isMissed ? (
                    <span className="inline-flex items-center gap-0.5 text-xs text-danger-ink">
                      Não dada
                    </span>
                  ) : isSkipped ? (
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted">
                      Pulada
                    </span>
                  ) : isCurrentDue ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        void giveDose(
                          d.schedule.id,
                          d.date,
                          d.time,
                          d.event?.id ?? null,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-full bg-warning-ink/15 px-2 py-0.5 text-xs font-bold text-warning-ink transition-colors hover:bg-warning-ink/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-warning-ink disabled:opacity-50"
                      aria-label={`Registrar dose das ${d.time} em 1 toque`}
                    >
                      <Check aria-hidden="true" className="size-3" />
                      Dar dose
                    </button>
                  ) : (
                    <span className="text-caption text-muted">Planejada</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger-ink">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {dose.due ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              void giveDose(
                dose.scheduleId,
                item.dueDate,
                dose.time,
                dose.eventId,
              )
            }
          >
            {pending ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Check aria-hidden="true" className="size-4" />
            )}
            {pending ? "Salvando…" : "Dose dada (1 toque)"}
          </Button>
        ) : null}
        <ButtonLink
          size="sm"
          variant="secondary"
          href={`/pets/${item.petId}/health/${item.id}`}
        >
          Plano e histórico de doses
        </ButtonLink>
        <AddToCalendarButton
          event={medEvent}
          size="sm"
          variant="secondary"
          label="Calendário"
        />
      </div>
    </article>
  );
}

function CareReminderCard({
  item,
  showPet = true,
}: {
  item: ReminderItem;
  showPet?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Action>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [editing, setEditing] = useState(false);
  const pets = useAppStore((state) => state.pets);
  const record = useAppStore((state) =>
    state.records.find(
      (entry) => item.source === "registro" && entry.id === item.id,
    ),
  );
  const manualReminder = useAppStore((state) =>
    state.reminders.find(
      (entry) => item.source === "manual" && entry.id === item.id,
    ),
  );
  const pet = useMemo(
    () => pets.find((p) => p.id === item.petId),
    [pets, item.petId],
  );
  const calendarEvent = useMemo(
    () => createCalendarEventFromReminder(item, pet, record),
    [item, pet, record],
  );

  async function runAction(
    action: Exclude<Action, null>,
    mutate: () => CareUndo | null | Promise<CareUndo | null>,
    title: string,
    description: string,
  ) {
    if (pending) return;
    setPending(action);
    setActionError(null);
    try {
      const undo = await mutate();
      setOpen(false);
      if (!undo) {
        toast("Este cuidado já foi concluído.");
        return;
      }
      toast.success(title, {
        description,
        action: {
          label: "Desfazer",
          onClick: async () => {
            try {
              await useAppStore.getState().undoCareAction(undo);
              toast.success("Alteração desfeita");
            } catch (cause) {
              toast.error(
                cause instanceof Error
                  ? cause.message
                  : "Não foi possível desfazer.",
              );
            }
          },
        },
        duration: 7000,
      });
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setPending(null);
    }
  }

  function complete() {
    runAction(
      "complete",
      () => useAppStore.getState().completeReminderItem(item),
      "Cuidado concluído",
      "Guardado no histórico. Você pode desfazer agora.",
    );
  }

  function snooze(days: number, description: string) {
    runAction(
      "snooze",
      () => useAppStore.getState().snoozeReminderItem(item, days),
      "Cuidado adiado",
      `${description}. A data do cuidado continua a mesma.`,
    );
  }

  function reschedule() {
    if (!isValidDateKey(rescheduleDate) || rescheduleDate < todayKey()) {
      setActionError("Escolha uma data válida a partir de hoje.");
      return;
    }
    runAction(
      "change",
      () => useAppStore.getState().rescheduleReminderItem(item, rescheduleDate),
      "Cuidado reagendado",
      `Nova data: ${formatShortDate(rescheduleDate)}.`,
    );
  }

  return (
    <article
      data-urgency={item.urgency}
      className={cn(
        "flex flex-col gap-3 rounded-card border border-line border-l-4 bg-paper p-4 transition-[border-color,background-color] duration-200 hover:border-teal/45 hover:bg-surface/45",
        urgencySurface[item.urgency],
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-body font-bold text-ink">{item.title}</h3>
            <Chip tone={urgencyTone[item.urgency]}>
              {urgencyLabels[item.urgency]}
            </Chip>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="size-3.5" />
              <span>{reminderAttentionText(item)}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={item.dueDate}>
                {formatShortDate(item.dueDate)}
              </time>
            </span>
            {showPet ? (
              <span className="inline-flex items-center gap-1">
                <PawPrint aria-hidden="true" className="size-3.5" />
                {item.petName}
              </span>
            ) : null}
          </p>
          {item.notes ? (
            <p className="mt-2 text-label leading-relaxed text-ink-soft">
              {item.notes}
            </p>
          ) : null}
          {item.snoozedUntil ? (
            <p className="mt-2 text-meta font-semibold text-info-ink">
              Adiado até {formatShortDate(item.snoozedUntil)}
            </p>
          ) : null}
        </div>
      </div>

      {actionError && !open ? (
        <p role="alert" className="text-sm font-semibold text-danger-ink">
          {actionError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={complete} disabled={pending !== null}>
          {pending === "complete" ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Check aria-hidden="true" className="size-4" />
          )}
          {pending === "complete" ? "Salvando…" : "Concluir cuidado"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setOpen(true)}
          disabled={pending !== null}
        >
          <CalendarClock aria-hidden="true" className="size-4" />
          Adiar ou reagendar
        </Button>
        <AddToCalendarButton
          event={calendarEvent}
          size="sm"
          variant="secondary"
        />
        {manualReminder ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditing(true)}
          >
            Editar lembrete
          </Button>
        ) : null}
      </div>

      <BottomSheet
        open={open}
        onClose={() => {
          if (!pending) {
            setOpen(false);
            setActionError(null);
          }
        }}
        title={item.title}
        description={`${item.petName} · ${reminderAttentionText(item)} · ${item.reason}`}
      >
        <div className="flex flex-col gap-3">
          <p className="text-body leading-relaxed text-muted">
            Concluir registra o cuidado feito hoje. Adiar mantém o item na
            agenda e só muda quando ele volta a pedir atenção.
          </p>
          {item.source === "registro" ? (
            <p className="rounded-control bg-surface px-3 py-2 text-meta text-muted">
              {record?.recurrenceMonths
                ? `Concluir registra o cuidado de hoje e cria o próximo para ${formatShortDate(addMonthsToKey(todayKey(), record.recurrenceMonths))}.`
                : "Concluir registra o cuidado de hoje no histórico, sem criar outro aviso."}
            </p>
          ) : null}
          {actionError ? (
            <p
              role="alert"
              className="rounded-control bg-danger/10 px-3 py-2 text-meta font-semibold text-danger-ink"
            >
              {actionError}
            </p>
          ) : null}
          <Button size="lg" onClick={complete} disabled={pending !== null}>
            {pending === "complete" ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            ) : (
              <Check aria-hidden="true" className="size-5" />
            )}
            {pending === "complete" ? "Salvando…" : "Marcar como feito"}
          </Button>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SNOOZE_OPTIONS.map((option) => (
              <Button
                key={option.label}
                variant="secondary"
                onClick={() => snooze(option.days, option.label)}
                disabled={pending !== null}
              >
                {pending === "snooze" ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : null}
                {option.label}
              </Button>
            ))}
          </div>
          <div className="border-t border-line/80 pt-3">
            <label
              htmlFor={`reschedule-${item.key}`}
              className="text-label font-semibold text-ink"
            >
              Reagendar para uma data específica
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id={`reschedule-${item.key}`}
                type="date"
                min={todayKey()}
                value={rescheduleDate}
                onChange={(event) => {
                  setRescheduleDate(event.target.value);
                  setActionError(null);
                }}
                className="min-h-12 flex-1 rounded-control border border-line bg-paper px-3.5 text-base text-ink focus:border-teal-ink focus:outline-none"
              />
              <Button
                variant="mint"
                onClick={reschedule}
                disabled={pending !== null}
              >
                Reagendar
              </Button>
            </div>
          </div>
          {record?.recurrenceMonths ? (
            <div className="flex flex-col gap-2 border-t border-line/80 pt-3">
              <p className="text-meta text-muted">
                Pular muda a próxima data para{" "}
                {formatShortDate(
                  addMonthsToKey(item.dueDate, record.recurrenceMonths),
                )}
                , sem registrar um cuidado realizado. Encerrar remove os
                próximos avisos e preserva o histórico.
              </p>
              <Button
                variant="secondary"
                disabled={pending !== null}
                onClick={() =>
                  runAction(
                    "change",
                    () => useAppStore.getState().skipReminderOccurrence(item),
                    "Ocorrência pulada",
                    "A próxima data foi atualizada. Nenhum cuidado foi marcado como realizado.",
                  )
                }
              >
                Pular esta ocorrência
              </Button>
              <Button
                variant="danger"
                disabled={pending !== null}
                onClick={() => {
                  // No confirm: the toast offers Undo right away.
                  runAction(
                      "change",
                      () => useAppStore.getState().stopReminderRecurrence(item),
                      "Recorrência encerrada",
                      "O histórico foi preservado. Você pode desfazer agora.",
                    );
                }}
              >
                Encerrar recorrência
              </Button>
            </div>
          ) : null}
          <div className="border-t border-line/80 pt-3">
            <p className="text-label font-semibold text-ink">
              Adicionar ao calendário nativo do celular
            </p>
            <p className="mt-0.5 text-meta text-muted">
              Receba alarmes com som mesmo se o navegador ou aplicativo estiver fechado.
            </p>
            <div className="mt-2.5">
              <AddToCalendarButton
                event={calendarEvent}
                variant="secondary"
                size="md"
                className="w-full justify-center"
              />
            </div>
          </div>
        </div>
      </BottomSheet>
      {manualReminder ? (
        <BottomSheet
          open={editing}
          onClose={() => setEditing(false)}
          title="Editar lembrete"
          description={item.petName}
        >
          <ReminderForm
            pets={pets}
            initial={manualReminder}
            onCancel={() => setEditing(false)}
            onSubmit={async (values) => {
              await useAppStore
                .getState()
                .updateReminder(manualReminder.id, values);
              setEditing(false);
              toast.success("Lembrete atualizado");
            }}
            onDelete={async () => {
              const deleted = manualReminder;
              await useAppStore.getState().removeReminder(deleted.id);
              setEditing(false);
              toast.success("Lembrete excluído", {
                action: {
                  label: "Desfazer",
                  onClick: () =>
                    void useAppStore
                      .getState()
                      .restoreDeleted({ collection: "reminders", item: deleted }),
                },
              });
            }}
          />
        </BottomSheet>
      ) : null}
    </article>
  );
}
