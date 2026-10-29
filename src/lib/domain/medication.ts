import { shiftDays } from "./dates";
import {
  medicationCourseSchema,
  medicationPlanInputSchema,
  type MedicationCourse,
  type MedicationDoseEvent,
  type MedicationDoseStatus,
  type MedicationPlanInput,
  type MedicationSchedule,
} from "./schema";

export type MedicationOccurrence = {
  schedule: MedicationSchedule;
  date: string;
  time: string;
  event: MedicationDoseEvent | null;
};

/** Calendar schedules follow their recorded timezone, including while travelling. */
export function medicationClock(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (name: string) =>
    parts.find((entry) => entry.type === name)?.value ?? "";
  const date = `${part("year")}-${part("month")}-${part("day")}`;
  return {
    date,
    time: `${part("hour")}:${part("minute")}`,
    key: `${date}T${part("hour")}:${part("minute")}:${part("second")}.${part("fractionalSecond")}`,
  };
}

const dayNumber = (date: string) =>
  Date.parse(`${date}T12:00:00Z`) / 86_400_000;
export const medicationDoseKey = (
  scheduleId: string,
  date: string,
  time: string,
) => `${scheduleId}:${date}T${time}`;
const occurrenceClock = (date: string, time: string) =>
  `${date}T${time}:00.000`;

export function isMedicationOccurrence(
  schedule: MedicationSchedule,
  date: string,
  time: string,
) {
  if (
    date < schedule.startsOn ||
    (schedule.endsOn && date > schedule.endsOn) ||
    !schedule.times.includes(time)
  )
    return false;
  if (
    (dayNumber(date) - dayNumber(schedule.startsOn)) % schedule.everyDays !==
    0
  )
    return false;
  const key = occurrenceClock(date, time);
  if (
    schedule.effectiveFrom &&
    key <
      medicationClock(schedule.timeZone, new Date(schedule.effectiveFrom)).key
  )
    return false;
  if (
    schedule.closedAt &&
    key >= medicationClock(schedule.timeZone, new Date(schedule.closedAt)).key
  )
    return false;
  return true;
}

export function latestDoseEvent(
  course: MedicationCourse,
  scheduleId: string,
  date: string,
  time: string,
) {
  return (
    course.events.findLast(
      (event) =>
        event.scheduleId === scheduleId &&
        event.date === date &&
        event.time === time,
    ) ?? null
  );
}

export function latestMedicationDoseEvents(
  course: MedicationCourse,
): MedicationDoseEvent[] {
  const latest = new Map<string, MedicationDoseEvent>();
  for (const event of course.events)
    latest.set(
      medicationDoseKey(event.scheduleId, event.date, event.time),
      event,
    );
  return [...latest.values()];
}

export function medicationDayOccurrences(
  course: MedicationCourse,
  date: string,
): MedicationOccurrence[] {
  return course.schedules
    .flatMap((schedule) =>
      schedule.times
        .filter((time) => isMedicationOccurrence(schedule, date, time))
        .map((time) => ({
          schedule,
          date,
          time,
          event: latestDoseEvent(course, schedule.id, date, time),
        })),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function activeMedicationSchedule(course: MedicationCourse) {
  return (
    course.schedules.find(
      (schedule) => schedule.id === course.activeScheduleId,
    ) ?? null
  );
}

export function medication24HoursOccurrences(
  course: MedicationCourse,
  now = new Date(),
): (MedicationOccurrence & { due: boolean; future: boolean })[] {
  const schedule = activeMedicationSchedule(course);
  if (!schedule) return [];
  const clock = medicationClock(schedule.timeZone, now);
  const today = clock.date;
  const tomorrow = shiftDays(today, 1);
  const nowKey = `${today}T${clock.time}`;
  const endKey = `${tomorrow}T${clock.time}`;

  const todayOccs = medicationDayOccurrences(course, today);
  const tomorrowOccs = medicationDayOccurrences(course, tomorrow);

  const all = [...todayOccs, ...tomorrowOccs].filter((occ) => {
    const key = `${occ.date}T${occ.time}`;
    return occ.date === today || key <= endKey;
  });

  return all.map((occ) => {
    const key = `${occ.date}T${occ.time}`;
    const future = key > nowKey;
    const status = occ.event?.status ?? "unrecorded";
    const due = !future && status === "unrecorded";
    return {
      ...occ,
      due,
      future,
    };
  });
}

export function nextMedicationOccurrence(
  course: MedicationCourse,
  now = new Date(),
): MedicationOccurrence | null {
  const schedule = activeMedicationSchedule(course);
  if (!schedule || schedule.closedAt) return null;
  const today = medicationClock(schedule.timeZone, now).date;
  let date = today < schedule.startsOn ? schedule.startsOn : today;
  const remainder =
    (dayNumber(date) - dayNumber(schedule.startsOn)) % schedule.everyDays;
  if (remainder !== 0) date = shiftDays(date, schedule.everyDays - remainder);
  // Future doses cannot have outcomes; at most today's cycle and the next are needed.
  for (let cycle = 0; cycle < 2; cycle++) {
    if (schedule.endsOn && date > schedule.endsOn) return null;
    for (const time of [...schedule.times].sort()) {
      if (!isMedicationOccurrence(schedule, date, time)) continue;
      const event = latestDoseEvent(course, schedule.id, date, time);
      if (!event || event.status === "unrecorded")
        return { schedule, date, time, event };
    }
    date = shiftDays(date, schedule.everyDays);
  }
  return null;
}

export function createMedicationCourse(
  input: MedicationPlanInput,
  id: string,
  now = new Date(),
): MedicationCourse {
  const plan = medicationPlanInputSchema.parse(input);
  return medicationCourseSchema.parse({
    activeScheduleId: id,
    schedules: [
      {
        ...plan,
        times: [...plan.times].sort(),
        id,
        effectiveFrom: null,
        closedAt: null,
        createdAt: now.toISOString(),
      },
    ],
    events: [],
  });
}

function planSignature(plan: MedicationPlanInput) {
  return JSON.stringify({
    ...medicationPlanInputSchema.parse(plan),
    times: [...plan.times].sort(),
  });
}

export function reviseMedicationCourse(
  course: MedicationCourse,
  input: MedicationPlanInput,
  newId: string,
  now = new Date(),
): MedicationCourse {
  const plan = medicationPlanInputSchema.parse(input);
  const active = activeMedicationSchedule(course);
  if (active && planSignature(active) === planSignature(plan)) return course;
  // A boundary just after the edit preserves a dose at this exact minute in the old plan.
  const boundary = new Date(now.getTime() + 1).toISOString();
  return medicationCourseSchema.parse({
    activeScheduleId: newId,
    schedules: [
      ...course.schedules.map((schedule) =>
        schedule.id === active?.id
          ? { ...schedule, closedAt: boundary }
          : schedule,
      ),
      {
        ...plan,
        times: [...plan.times].sort(),
        id: newId,
        effectiveFrom: boundary,
        closedAt: null,
        createdAt: now.toISOString(),
      },
    ],
    events: course.events,
  });
}

export function endMedicationCourse(
  course: MedicationCourse,
  expectedScheduleId: string,
  now = new Date(),
): MedicationCourse {
  if (!course.activeScheduleId) return course;
  if (course.activeScheduleId !== expectedScheduleId)
    throw new Error("O plano mudou. Confira os horários antes de encerrar.");
  return medicationCourseSchema.parse({
    ...course,
    activeScheduleId: null,
    schedules: course.schedules.map((schedule) =>
      schedule.id === expectedScheduleId
        ? { ...schedule, closedAt: new Date(now.getTime() + 1).toISOString() }
        : schedule,
    ),
  });
}

export type RecordMedicationDoseInput = {
  scheduleId: string;
  date: string;
  time: string;
  status: MedicationDoseStatus;
  expectedEventId: string | null;
  note?: string | null;
  recordedBy?: string | null;
  actorRole?: "tutor" | "co_tutor" | "cuidador" | null;
};

export function recordMedicationDose(
  course: MedicationCourse,
  input: RecordMedicationDoseInput,
  eventId: string,
  now = new Date(),
): MedicationCourse {
  const schedule = course.schedules.find(
    (plan) => plan.id === input.scheduleId,
  );
  if (!schedule || !isMedicationOccurrence(schedule, input.date, input.time))
    throw new Error(
      "Essa dose não faz parte do plano. Confira o histórico atualizado.",
    );
  if (
    occurrenceClock(input.date, input.time) >
    medicationClock(schedule.timeZone, now).key
  )
    throw new Error(
      "Este horário ainda não chegou. Confira o plano antes de registrar a dose.",
    );
  const previous = latestDoseEvent(
    course,
    input.scheduleId,
    input.date,
    input.time,
  );
  if ((previous?.id ?? null) !== input.expectedEventId) {
    if (previous?.status === input.status) return course;
    throw new Error(
      "Esta dose mudou em outra tela. Confira o registro antes de corrigir.",
    );
  }
  if (
    previous?.status === input.status ||
    (!previous && input.status === "unrecorded")
  )
    return course;
  return medicationCourseSchema.parse({
    ...course,
    events: [
      ...course.events,
      {
        id: eventId,
        scheduleId: input.scheduleId,
        date: input.date,
        time: input.time,
        status: input.status,
        recordedAt: now.toISOString(),
        note: input.note?.trim() || null,
        correctsId: previous?.id ?? null,
        recordedBy: input.recordedBy?.trim() || null,
        actorRole: input.actorRole ?? null,
      },
    ],
  });
}

export const medicationDoseStatusLabels: Record<MedicationDoseStatus, string> =
  {
    given: "Dada",
    skipped: "Pulada",
    missed: "Não dada",
    unrecorded: "Sem confirmação",
  };
