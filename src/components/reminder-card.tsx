"use client";

import {
  CalendarClock,
  Check,
  Clock,
  LoaderCircle,
  PawPrint,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { BottomSheet } from "@/components/ui/sheet";
import { daysUntil, formatShortDate, todayKey } from "@/lib/domain/dates";
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

type Action = "complete" | "snooze" | null;

type StoreSnapshot = {
  records: ReturnType<typeof useAppStore.getState>["records"];
  reminders: ReturnType<typeof useAppStore.getState>["reminders"];
  snoozes: ReturnType<typeof useAppStore.getState>["snoozes"];
};

export function ReminderCard({
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
  const completeReminderItem = useAppStore(
    (state) => state.completeReminderItem,
  );
  const snoozeReminderItem = useAppStore((state) => state.snoozeReminderItem);
  const snapshotRef = useRef<StoreSnapshot | null>(null);

  function captureSnapshot() {
    const state = useAppStore.getState();
    snapshotRef.current = {
      records: state.records,
      reminders: state.reminders,
      snoozes: state.snoozes,
    };
  }

  function undoLastAction() {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    useAppStore.setState(snapshot);
    snapshotRef.current = null;
    toast.success("Cuidado restaurado", {
      description: "A agenda voltou ao estado anterior neste aparelho.",
    });
  }

  function complete() {
    if (pending) return;
    setPending("complete");
    setActionError(null);
    captureSnapshot();
    try {
      completeReminderItem(item);
      setOpen(false);
      toast.success("Cuidado concluído", {
        description:
          item.source === "registro"
            ? "O cuidado foi guardado no histórico. Você pode desfazer agora."
            : "O lembrete foi arquivado. Você pode desfazer agora.",
        action: { label: "Desfazer", onClick: undoLastAction },
        duration: 7000,
      });
    } catch {
      snapshotRef.current = null;
      setActionError(
        "Não foi possível concluir este cuidado. Tente novamente.",
      );
    } finally {
      setPending(null);
    }
  }

  function snooze(days: number, description: string) {
    if (pending) return;
    setPending("snooze");
    setActionError(null);
    captureSnapshot();
    try {
      snoozeReminderItem(item, days);
      setOpen(false);
      toast("Cuidado adiado", {
        description: `${description}. Você pode desfazer agora.`,
        action: { label: "Desfazer", onClick: undoLastAction },
        duration: 7000,
      });
    } catch {
      snapshotRef.current = null;
      setActionError("Não foi possível adiar este cuidado. Tente novamente.");
    } finally {
      setPending(null);
    }
  }

  function reschedule() {
    if (!rescheduleDate) {
      setActionError("Escolha uma data para reagendar.");
      return;
    }
    const days = daysUntil(rescheduleDate);
    if (days < 1) {
      setActionError("Escolha uma data a partir de amanhã.");
      return;
    }
    snooze(days, `Reagendado para ${formatShortDate(rescheduleDate)}`);
    setRescheduleDate("");
  }

  return (
    <article
      data-urgency={item.urgency}
      className={cn(
        "flex flex-col gap-3 rounded-[18px] border border-line border-l-4 bg-white p-4 transition-[border-color,background-color] duration-200 hover:border-teal/45 hover:bg-surface/45",
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
              Ao concluir, o próximo ciclo usa a recorrência deste registro e
              aparece no histórico.
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
                className="min-h-12 flex-1 rounded-[14px] border border-line bg-white px-3.5 text-base text-ink focus:border-teal-ink focus:outline-none"
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
        </div>
      </BottomSheet>
    </article>
  );
}
