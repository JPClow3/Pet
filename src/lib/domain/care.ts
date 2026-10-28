import { isValidDateKey, todayKey } from "./dates";
import {
  healthRecordSchema,
  reminderSchema,
  type HealthRecord,
  type Reminder,
} from "./schema";

export function validateCareRecord(record: HealthRecord): HealthRecord {
  if (
    record.medication &&
    (record.type !== "medicamento" ||
      record.nextDueDate !== null ||
      record.recurrenceMonths !== null ||
      record.completedAt !== null)
  ) {
    throw new Error(
      "O plano de medicação usa seus próprios horários e histórico de doses.",
    );
  }
  if (!isValidDateKey(record.date) || record.date > todayKey()) {
    throw new Error("Informe uma data válida, até hoje, para o cuidado.");
  }
  if (
    record.nextDueDate !== null &&
    (!isValidDateKey(record.nextDueDate) || record.nextDueDate < record.date)
  ) {
    throw new Error(
      "A próxima data deve ser válida e posterior ou igual ao cuidado.",
    );
  }
  if (record.type === "peso" && record.weightKg === null) {
    throw new Error("Informe o peso em quilos.");
  }
  return healthRecordSchema.parse(record);
}

export function validateRoutineReminder(reminder: Reminder): Reminder {
  if (!isValidDateKey(reminder.dueDate)) {
    throw new Error("Informe uma data válida para o lembrete.");
  }
  return reminderSchema.parse(reminder);
}

export type CareUndo = {
  petId: string;
  key: string;
  records: { before: HealthRecord | null; after: HealthRecord }[];
  reminders: { before: Reminder; after: Reminder }[];
  snoozeBefore: string | undefined;
  snoozeAfter: string | undefined;
};

/** Compare values so a reload or cloud refresh does not invalidate an unchanged item. */
export function sameCareValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
