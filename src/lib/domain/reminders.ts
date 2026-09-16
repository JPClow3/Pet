import { daysUntil, isValidDateKey, shiftDays, todayKey } from "./dates";
import { urgencyFor, urgencyText, type Urgency } from "./health";
import type { HealthRecord, Pet, Reminder } from "./schema";

export type ReminderItem = {
  key: string;
  source: "registro" | "manual";
  id: string;
  petId: string;
  petName: string;
  title: string;
  dueDate: string;
  leadDays: number;
  days: number;
  urgency: Urgency;
  notes: string | null;
  snoozedUntil: string | null;
  reason: string;
};

export type SnoozeMap = Record<string, string>;

export function reminderKey(
  source: ReminderItem["source"],
  id: string,
): string {
  return `${source}:${id}`;
}

export function buildReminders(input: {
  pets: Pet[];
  records: HealthRecord[];
  reminders: Reminder[];
  snoozes: SnoozeMap;
  now?: Date;
}): ReminderItem[] {
  const now = input.now ?? new Date();
  const petById = new Map(input.pets.map((pet) => [pet.id, pet]));
  const items: ReminderItem[] = [];

  for (const record of input.records) {
    if (!isValidDateKey(record.nextDueDate)) continue;
    const pet = petById.get(record.petId);
    if (!pet) continue;
    const key = reminderKey("registro", record.id);
    const snoozedUntil = input.snoozes[key] ?? null;
    const { urgency, days } = urgencyFor(
      record.nextDueDate as string,
      record.leadDays,
      now,
    );
    items.push({
      key,
      source: "registro",
      id: record.id,
      petId: pet.id,
      petName: pet.name,
      title: record.title,
      dueDate: record.nextDueDate as string,
      leadDays: record.leadDays,
      days,
      urgency,
      notes: record.notes,
      snoozedUntil,
      reason: "Aviso do registro de saúde",
    });
  }

  for (const reminder of input.reminders) {
    if (reminder.done) continue;
    const pet = petById.get(reminder.petId);
    if (!pet) continue;
    const key = reminderKey("manual", reminder.id);
    const snoozedUntil = input.snoozes[key] ?? null;
    const { urgency, days } = urgencyFor(
      reminder.dueDate,
      reminder.leadDays,
      now,
    );
    items.push({
      key,
      source: "manual",
      id: reminder.id,
      petId: pet.id,
      petName: pet.name,
      title: reminder.title,
      dueDate: reminder.dueDate,
      leadDays: reminder.leadDays,
      days,
      urgency,
      notes: reminder.notes,
      snoozedUntil,
      reason: "Lembrete criado por você",
    });
  }

  return items.sort((a, b) => {
    const order: Urgency[] = ["vencido", "hoje", "proximo", "futuro"];
    const urgencyDelta = order.indexOf(a.urgency) - order.indexOf(b.urgency);
    if (urgencyDelta !== 0) return urgencyDelta;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export function isSnoozed(item: ReminderItem, now: Date = new Date()): boolean {
  if (!item.snoozedUntil) return false;
  return daysUntil(item.snoozedUntil, now) > 0;
}

export function activeReminders(
  items: ReminderItem[],
  now: Date = new Date(),
): ReminderItem[] {
  return items.filter((item) => !isSnoozed(item, now));
}

export function reminderSummary(items: ReminderItem[]): {
  overdue: number;
  today: number;
  soon: number;
} {
  return {
    overdue: items.filter((item) => item.urgency === "vencido").length,
    today: items.filter((item) => item.urgency === "hoje").length,
    soon: items.filter((item) => item.urgency === "proximo").length,
  };
}

export function reminderAttentionText(item: ReminderItem): string {
  return urgencyText(item.days);
}

export function snoozeUntil(days: number, now: Date = new Date()): string {
  return shiftDays(todayKey(now), days);
}

export const SNOOZE_OPTIONS = [
  { label: "Adiar 1 dia", days: 1 },
  { label: "Adiar 3 dias", days: 3 },
  { label: "Adiar 1 semana", days: 7 },
];
