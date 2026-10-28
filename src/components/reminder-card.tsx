"use client";

import {
  CalendarClock,
  Check,
  Clock,
  LoaderCircle,
  PawPrint,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button, ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { BottomSheet } from "@/components/ui/sheet";
import { ReminderForm } from "@/components/reminder-form";
import {
  addMonthsToKey,
  formatShortDate,
  isValidDateKey,
  todayKey,
} from "@/lib/domain/dates";
import type { CareUndo } from "@/lib/domain/care";
import { urgencyLabels } from "@/lib/domain/labels";
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
  return (
    <article
      className="flex flex-col gap-3 rounded-[18px] border border-line bg-paper p-4"
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
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                await useAppStore
                  .getState()
                  .recordMedicationDose(item.id, {
                    scheduleId: dose.scheduleId,
                    date: item.dueDate,
                    time: dose.time,
                    status: "given",
                    expectedEventId: dose.eventId,
                  });
                toast.success("Dose registrada como dada");
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Não foi possível salvar.",
                );
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Salvando…" : "Dose dada"}
          </Button>
        ) : null}
        <ButtonLink
          size="sm"
          variant="secondary"
          href={`/pets/${item.petId}/health/${item.id}`}
        >
          Plano e histórico de doses
        </ButtonLink>
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
        "flex flex-col gap-3 rounded-[18px] border border-line border-l-4 bg-paper p-4 transition-[border-color,background-color] duration-200 hover:border-teal/45 hover:bg-surface/45",
        urgencySurface[item.urgency],
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[1rem] font-bold text-ink">{item.title}</h3>
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
            <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
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
          <p className="text-[0.92rem] leading-relaxed text-muted">
            Concluir registra o cuidado feito hoje. Adiar mantém o item na
            agenda e só muda quando ele volta a pedir atenção.
          </p>
          {item.source === "registro" ? (
            <p className="rounded-[14px] bg-surface px-3 py-2 text-meta text-muted">
              {record?.recurrenceMonths
                ? `Concluir registra o cuidado de hoje e cria o próximo para ${formatShortDate(addMonthsToKey(todayKey(), record.recurrenceMonths))}.`
                : "Concluir registra o cuidado de hoje no histórico, sem criar outro aviso."}
            </p>
          ) : null}
          {actionError ? (
            <p
              role="alert"
              className="rounded-[14px] bg-danger/10 px-3 py-2 text-meta font-semibold text-danger-ink"
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
              className="text-[0.85rem] font-semibold text-ink"
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
                className="min-h-12 flex-1 rounded-[14px] border border-line bg-paper px-3.5 text-base text-ink focus:border-teal-ink focus:outline-none"
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
                  if (
                    window.confirm(
                      `Encerrar os próximos avisos de "${item.title}"? O histórico será preservado.`,
                    )
                  )
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
              await useAppStore.getState().removeReminder(manualReminder.id);
              setEditing(false);
              toast.success("Lembrete excluído");
            }}
          />
        </BottomSheet>
      ) : null}
    </article>
  );
}
