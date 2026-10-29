import type { CareSyncEvent } from "@/lib/domain/collaboration";
import { medicationDoseKey } from "@/lib/domain/medication";
import {
  medicationCourseSchema,
  medicationDoseEventSchema,
  type HealthRecord,
  type MedicationDoseEvent,
} from "@/lib/domain/schema";
import { postCareSyncEvent } from "./collaboration-client";

let activeUserId: string | null = null;
export function setCareSyncUser(userId: string | null) {
  activeUserId = userId;
}

export async function publishMedicationDose(
  record: HealthRecord,
  event: MedicationDoseEvent,
) {
  if (
    !activeUserId ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  )
    return null;
  return postCareSyncEvent(activeUserId, {
    petId: record.petId,
    recordId: record.id,
    scheduleId: event.scheduleId,
    actorName: event.recordedBy || "Tutor",
    eventType: "medication_dose",
    eventKey: medicationDoseKey(event.scheduleId, event.date, event.time),
    status: event.status,
    payload: { ...event, eventId: event.id, correctsId: event.correctsId },
  });
}

/** Keep the server's winning occurrence and its attribution on every device. */
export function mergeSharedMedicationEvents(
  records: HealthRecord[],
  events: CareSyncEvent[],
) {
  return records.map((record) => {
    if (!record.medication) return record;
    let course = record.medication;
    let updatedAt = record.updatedAt ?? record.createdAt;
    for (const shared of events) {
      if (
        shared.petId !== record.petId ||
        shared.eventType !== "medication_dose" ||
        (shared.recordId ?? shared.payload.recordId) !== record.id
      )
        continue;
      const match = /^(.*):(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(
        shared.eventKey,
      );
      if (
        !match ||
        !course.schedules.some((schedule) => schedule.id === match[1])
      )
        continue;
      const parsed = medicationDoseEventSchema.safeParse({
        id:
          typeof shared.payload.eventId === "string"
            ? shared.payload.eventId
            : `shared-${shared.id}`,
        scheduleId: match[1],
        date: match[2],
        time: match[3],
        status: shared.status,
        recordedAt: shared.occurredAt,
        recordedBy: shared.actorName,
        actorRole: shared.actorRole,
        note:
          typeof shared.payload.note === "string" ? shared.payload.note : null,
        correctsId:
          typeof shared.payload.correctsId === "string"
            ? shared.payload.correctsId
            : null,
      });
      if (!parsed.success) continue;
      const dose = parsed.data;
      const current = course.events.findLast(
        (item) =>
          medicationDoseKey(item.scheduleId, item.date, item.time) ===
          shared.eventKey,
      );
      if (
        current?.id === dose.id &&
        current.status === dose.status &&
        current.recordedBy === dose.recordedBy &&
        current.actorRole === dose.actorRole
      )
        continue;
      const existingIndex = course.events.findIndex(
        (item) => item.id === dose.id,
      );
      const candidate = {
        ...course,
        events:
          existingIndex >= 0
            ? course.events
                .filter(
                  (item, index) =>
                    medicationDoseKey(item.scheduleId, item.date, item.time) !==
                      shared.eventKey || index <= existingIndex,
                )
                .map((item) =>
                  item.id === dose.id
                    ? { ...dose, correctsId: item.correctsId }
                    : item,
                )
            : !current && dose.status === "unrecorded"
              ? course.events
              : [
                  ...course.events,
                  { ...dose, correctsId: current?.id ?? null },
                ],
      };
      const validated = medicationCourseSchema.safeParse(candidate);
      if (validated.success) {
        course = validated.data;
        if (!updatedAt || shared.occurredAt > updatedAt)
          updatedAt = shared.occurredAt;
      }
    }
    return course === record.medication
      ? record
      : { ...record, medication: course, updatedAt };
  });
}
