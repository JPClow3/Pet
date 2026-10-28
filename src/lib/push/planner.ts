import { Temporal } from "@js-temporal/polyfill";
import { isValidDateKey } from "@/lib/domain/dates";
import {
  activeMedicationSchedule,
  isMedicationOccurrence,
  latestMedicationDoseEvents,
  medicationDoseKey,
} from "@/lib/domain/medication";
import type { HealthRecord, Pet, Reminder } from "@/lib/domain/schema";
import {
  pushAgendaSchema,
  pushPreferencesSchema,
  type PushAgenda,
  type PushOccurrence,
  type PushPreferences,
} from "./schema";

type AgendaSource = {
  pets: Pick<Pet, "id">[];
  records: HealthRecord[];
  reminders: Reminder[];
  snoozes: Record<string, string>;
};

/** Compatible picks the earlier repeated time and moves a nonexistent time forward by its DST gap. */
function scheduledInstant(date: string, time: string, zone: string) {
  return Temporal.PlainDate.from(date)
    .toPlainDateTime(Temporal.PlainTime.from(time))
    .toZonedDateTime(zone, { disambiguation: "compatible" })
    .toInstant();
}

function inQuietHours(instant: Temporal.Instant, preferences: PushPreferences) {
  if (
    !preferences.quietEnabled ||
    preferences.quietStart === preferences.quietEnd
  )
    return false;
  const current = instant
    .toZonedDateTimeISO(preferences.timeZone)
    .toPlainTime()
    .toString({ smallestUnit: "minute" });
  return preferences.quietStart < preferences.quietEnd
    ? current >= preferences.quietStart && current < preferences.quietEnd
    : current >= preferences.quietStart || current < preferences.quietEnd;
}

export function buildPushAgenda(
  source: AgendaSource,
  input: PushPreferences,
  now = new Date(),
): PushAgenda {
  const preferences = pushPreferencesSchema.parse(input);
  const start = Temporal.Instant.fromEpochMilliseconds(now.getTime());
  const until = start.add({ hours: 7 * 24 });
  const validUntil = new Date(until.epochMilliseconds).toISOString();
  const occurrences = new Map<string, PushOccurrence>();
  const pets = new Set(source.pets.map((pet) => pet.id));
  const append = (
    key: string,
    kind: PushOccurrence["kind"],
    due: Temporal.Instant,
    lifetimeMinutes: number,
  ) => {
    if (Temporal.Instant.compare(due, until) >= 0) return;
    const expires = Math.min(
      due.epochMilliseconds + lifetimeMinutes * 60_000,
      until.epochMilliseconds,
    );
    // Publishing again must not cancel a just-due notification before the dispatcher claims it.
    // Keep the original due time and expiry; never extend the delivery window from publication time.
    if (expires <= start.epochMilliseconds) return;
    occurrences.set(key, {
      key,
      kind,
      dueAt: new Date(due.epochMilliseconds).toISOString(),
      expiresAt: new Date(expires).toISOString(),
      suppressed: inQuietHours(due, preferences),
    });
    if (occurrences.size > 1000)
      throw new Error(
        "Há mais de 1.000 avisos nos próximos sete dias. Reduza os planos ativos antes de publicar a agenda.",
      );
  };
  const general = (
    id: string,
    sourceType: "registro" | "manual",
    dueDate: string,
    leadDays: number,
    kind: PushOccurrence["kind"],
  ) => {
    if (!isValidDateKey(dueDate)) return;
    const due = Temporal.PlainDate.from(dueDate);
    const days = new Set([due.toString()]);
    if (leadDays > 0) days.add(due.subtract({ days: leadDays }).toString());
    const snooze = source.snoozes[`${sourceType}:${id}`];
    for (const date of days) {
      const effectiveDate =
        isValidDateKey(snooze) && snooze > date ? snooze : date;
      // Same-day collisions after snoozing collapse to one occurrence.
      const key = `${sourceType}:${encodeURIComponent(id)}:${dueDate}:${effectiveDate}`;
      append(
        key,
        kind,
        scheduledInstant(
          effectiveDate,
          preferences.dailyTime,
          preferences.timeZone,
        ),
        6 * 60,
      );
    }
  };

  for (const record of source.records) {
    if (!pets.has(record.petId)) continue;
    if (record.medication) {
      if (!preferences.routine) continue;
      const plan = activeMedicationSchedule(record.medication);
      if (!plan || plan.closedAt) continue;
      const latest = new Map(
        latestMedicationDoseEvents(record.medication).map((event) => [
          medicationDoseKey(event.scheduleId, event.date, event.time),
          event,
        ]),
      );
      let date = start
        .subtract({ minutes: 30 })
        .toZonedDateTimeISO(plan.timeZone)
        .toPlainDate();
      const lastDate = until.toZonedDateTimeISO(plan.timeZone).toPlainDate();
      for (
        ;
        Temporal.PlainDate.compare(date, lastDate) <= 0;
        date = date.add({ days: 1 })
      ) {
        const dateKey = date.toString();
        for (const time of plan.times) {
          if (!isMedicationOccurrence(plan, dateKey, time)) continue;
          const doseKey = medicationDoseKey(plan.id, dateKey, time);
          const event = latest.get(doseKey);
          if (event && event.status !== "unrecorded") continue;
          const due = scheduledInstant(dateKey, time, plan.timeZone);
          if (
            plan.effectiveFrom &&
            Temporal.Instant.compare(
              due,
              Temporal.Instant.from(plan.effectiveFrom),
            ) < 0
          )
            continue;
          if (
            plan.closedAt &&
            Temporal.Instant.compare(
              due,
              Temporal.Instant.from(plan.closedAt),
            ) >= 0
          )
            continue;
          append(
            `med:${encodeURIComponent(record.id)}:${encodeURIComponent(plan.id)}:${dateKey}T${time}`,
            "routine",
            due,
            30,
          );
        }
      }
    } else if (record.nextDueDate && preferences.prevention) {
      general(
        record.id,
        "registro",
        record.nextDueDate,
        record.leadDays,
        "prevention",
      );
    }
  }
  if (preferences.routine)
    for (const reminder of source.reminders) {
      if (!reminder.done && pets.has(reminder.petId))
        general(reminder.id, "manual", reminder.dueDate, 0, "routine");
    }
  return pushAgendaSchema.parse({
    generatedAt: new Date(start.epochMilliseconds).toISOString(),
    validUntil,
    occurrences: [...occurrences.values()].sort(
      (a, b) => a.dueAt.localeCompare(b.dueAt) || a.key.localeCompare(b.key),
    ),
  });
}
