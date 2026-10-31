import { compareDesc } from "date-fns";
import {
  formatMonthYear,
  formatShortDate,
  daysUntil,
  isValidDateKey,
} from "./dates";
import type { HealthRecord } from "./schema";
import { medicationClock, nextMedicationOccurrence } from "./medication";

export type Urgency = "vencido" | "hoje" | "proximo" | "futuro";

export function urgencyFor(
  dueDate: string,
  leadDays: number,
  now: Date = new Date(),
): { urgency: Urgency; days: number } {
  const days = daysUntil(dueDate, now);
  if (days < 0) return { urgency: "vencido", days };
  if (days === 0) return { urgency: "hoje", days };
  if (days <= leadDays) return { urgency: "proximo", days };
  return { urgency: "futuro", days };
}

export function urgencyText(days: number): string {
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  if (days > 1) return `vence em ${days} dias`;
  if (days === -1) return "venceu ontem";
  return `venceu há ${Math.abs(days)} dias`;
}

export function dueRecords(
  records: HealthRecord[],
  now = new Date(),
): HealthRecord[] {
  return records
    .map((record) =>
      record.medication
        ? {
            ...record,
            nextDueDate:
              nextMedicationOccurrence(record.medication, now)?.date ?? null,
            leadDays: 0,
          }
        : record,
    )
    .filter((record) => isValidDateKey(record.nextDueDate));
}

export function sortByDue(
  records: HealthRecord[],
  now = new Date(),
): HealthRecord[] {
  return [...dueRecords(records, now)].sort((a, b) =>
    (a.nextDueDate ?? "").localeCompare(b.nextDueDate ?? ""),
  );
}

export function sortByDateDesc(records: HealthRecord[]): HealthRecord[] {
  return [...records].sort((a, b) =>
    compareDesc(new Date(a.date), new Date(b.date)),
  );
}

/**
 * "em_dia" only means nothing is due before a known next date; "sem_agenda"
 * means there are records but no next date, so the app can't vouch for it.
 */
export type HealthState =
  "vazio" | "sem_agenda" | "em_dia" | "atencao" | "vencido";

export type HealthStatus = {
  state: HealthState;
  headline: string;
  detail: string;
  nextRecord: HealthRecord | null;
  nextDays: number | null;
  overdueCount: number;
  soonCount: number;
};

export function healthStatus(
  records: HealthRecord[],
  now: Date = new Date(),
): HealthStatus {
  if (records.length === 0) {
    return {
      state: "vazio",
      headline: "Nenhum cuidado registrado",
      detail: "Comece pela vacina mais recente da carteirinha.",
      nextRecord: null,
      nextDays: null,
      overdueCount: 0,
      soonCount: 0,
    };
  }

  const due = sortByDue(records, now);
  const scored = due.map((record) => ({
    record,
    ...recordUrgency(record, now),
  }));

  const overdue = scored.filter((item) => item.urgency === "vencido");
  const soon = scored.filter(
    (item) => item.urgency === "hoje" || item.urgency === "proximo",
  );
  const next = scored[0] ?? null;

  if (overdue.length > 0) {
    const first = overdue[0];
    return {
      state: "vencido",
      headline:
        overdue.length === 1
          ? `${first.record.title} está vencido`
          : `${overdue.length} cuidados vencidos`,
      detail:
        overdue.length === 1
          ? `Venceu em ${formatShortDate(first.record.nextDueDate ?? "")}.`
          : `O mais antigo é ${first.record.title.toLowerCase()}, de ${formatShortDate(
              first.record.nextDueDate ?? "",
            )}.`,
      nextRecord: first.record,
      nextDays: first.days,
      overdueCount: overdue.length,
      soonCount: soon.length,
    };
  }

  if (soon.length > 0) {
    const first = soon[0];
    return {
      state: "atencao",
      headline:
        first.days === 0
          ? `${first.record.title} é hoje`
          : `${first.record.title} ${urgencyText(first.days)}`,
      detail:
        soon.length === 1
          ? "Único cuidado pedindo atenção agora."
          : `${soon.length} cuidados pedindo atenção nas próximas semanas.`,
      nextRecord: first.record,
      nextDays: first.days,
      overdueCount: 0,
      soonCount: soon.length,
    };
  }

  if (!next) {
    return {
      state: "sem_agenda",
      headline: "Nenhuma próxima data marcada",
      detail:
        "Ao registrar uma vacina ou vermífugo com a próxima dose, ela aparece aqui.",
      nextRecord: null,
      nextDays: null,
      overdueCount: 0,
      soonCount: 0,
    };
  }

  return {
    state: "em_dia",
    headline: next.record.nextDueDate
      ? `Nada pendente até ${formatShortDate(next.record.nextDueDate)}`
      : "Nada pendente agora",
    detail: `Próximo cuidado: ${next.record.title.toLowerCase()}.`,
    nextRecord: next.record,
    nextDays: next.days,
    overdueCount: 0,
    soonCount: 0,
  };
}

export function upcomingRecords(
  records: HealthRecord[],
  now: Date = new Date(),
  limit = 3,
): { record: HealthRecord; days: number; urgency: Urgency }[] {
  return sortByDue(records, now)
    .map((record) => ({
      record,
      ...recordUrgency(record, now),
    }))
    .slice(0, limit);
}

function recordUrgency(
  record: HealthRecord,
  now: Date,
): { days: number; urgency: Urgency } {
  const dose = record.medication
    ? nextMedicationOccurrence(record.medication, now)
    : null;
  if (!dose) return urgencyFor(record.nextDueDate ?? "", record.leadDays, now);
  const clock = medicationClock(dose.schedule.timeZone, now);
  const days = Math.round(
    (Date.parse(`${dose.date}T12:00:00Z`) -
      Date.parse(`${clock.date}T12:00:00Z`)) /
      86400000,
  );
  return {
    days,
    urgency: days === 0 ? "hoje" : days < 0 ? "vencido" : "futuro",
  };
}

export type WeightPoint = { date: string; weightKg: number };

export function weightHistory(
  records: { date: string; weightKg: number | null }[],
): WeightPoint[] {
  return records
    .filter((record) => record.weightKg !== null)
    .map((record) => ({
      date: record.date,
      weightKg: record.weightKg as number,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function weightTrend(
  records: { date: string; weightKg: number | null }[],
  fallbackWeight: number | null = null,
): {
  latest: number;
  previous: number | null;
  deltaKg: number;
  sinceLabel: string | null;
} | null {
  const history = weightHistory(records);
  if (history.length === 0) {
    if (fallbackWeight === null) return null;
    return {
      latest: fallbackWeight,
      previous: null,
      deltaKg: 0,
      sinceLabel: null,
    };
  }
  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;
  return {
    latest: latest.weightKg,
    previous: previous?.weightKg ?? null,
    deltaKg: previous
      ? Number((latest.weightKg - previous.weightKg).toFixed(1))
      : 0,
    sinceLabel: previous ? formatMonthYear(previous.date) : null,
  };
}

export function countByType(records: HealthRecord[]): Record<string, number> {
  return records.reduce<Record<string, number>>((acc, record) => {
    acc[record.type] = (acc[record.type] ?? 0) + 1;
    return acc;
  }, {});
}
