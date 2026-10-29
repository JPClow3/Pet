import { afterEach, describe, expect, it, vi } from "vitest";
import type { CareSyncEvent } from "@/lib/domain/collaboration";
import {
  medicationCourseSchema,
  type HealthRecord,
  type MedicationDoseEvent,
} from "@/lib/domain/schema";
import {
  mergeSharedMedicationEvents,
  publishMedicationDose,
  setCareSyncUser,
} from "./care-sync";

const dose: MedicationDoseEvent = {
  id: "dose-local",
  scheduleId: "schedule-a",
  date: "2026-10-28",
  time: "08:00",
  status: "given",
  recordedAt: "2026-10-28T11:00:00.000Z",
  recordedBy: "Tutor",
  actorRole: "tutor",
  note: null,
  correctsId: null,
};
const record: HealthRecord = {
  id: "record-a",
  petId: "pet-a",
  type: "medicamento",
  title: "Receita",
  date: "2026-10-28",
  nextDueDate: null,
  leadDays: 0,
  recurrenceMonths: null,
  professional: null,
  notes: null,
  attachmentName: null,
  attachmentData: null,
  weightKg: null,
  completedAt: null,
  createdAt: "2026-10-28T10:00:00.000Z",
  medication: {
    activeScheduleId: "schedule-a",
    schedules: [
      {
        id: "schedule-a",
        startsOn: "2026-10-28",
        endsOn: null,
        times: ["08:00"],
        everyDays: 1,
        amount: "1",
        unit: "comp",
        instructions: "",
        source: "Receita veterinária",
        timeZone: "America/Sao_Paulo",
        closedAt: null,
        effectiveFrom: null,
        createdAt: "2026-10-28T10:00:00.000Z",
      },
    ],
    events: [],
  },
};
const shared: CareSyncEvent = {
  id: "server-a",
  petId: "pet-a",
  ownerUserId: "owner-a",
  actorUserId: null,
  actorName: "Ana",
  actorRole: "cuidador",
  eventType: "medication_dose",
  recordId: "record-a",
  scheduleId: "schedule-a",
  eventKey: "schedule-a:2026-10-28T08:00",
  status: "given",
  payload: {},
  occurredAt: "2026-10-28T11:01:00.000Z",
  createdAt: "2026-10-28T11:01:00.000Z",
};

afterEach(() => {
  setCareSyncUser(null);
  vi.restoreAllMocks();
});
describe("daily shared medication logging", () => {
  it("posts the canonical occurrence when an account is active", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ event: shared }));
    setCareSyncUser("owner-a");
    expect(await publishMedicationDose(record, dose)).toEqual(shared);
    expect(fetch).toHaveBeenCalledWith(
      "/api/cloud/care-sync",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-PetHub-User": "owner-a" }),
      }),
    );
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({
      eventKey: shared.eventKey,
      payload: { eventId: dose.id },
    });
  });
  it("keeps a device-only pet local and surfaces network failures", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }));
    setCareSyncUser("owner-a");
    expect(await publishMedicationDose(record, dose)).toBeNull();
    fetch.mockRejectedValueOnce(new Error("offline"));
    await expect(publishMedicationDose(record, dose)).rejects.toThrow(
      "offline",
    );
  });
  it("applies another caregiver's winning dose with valid local correction history", () => {
    const local = {
      ...record,
      medication: { ...record.medication!, events: [dose] },
    };
    const [merged] = mergeSharedMedicationEvents([local], [shared]);
    expect(merged.medication!.events.at(-1)).toMatchObject({
      id: "shared-server-a",
      recordedBy: "Ana",
      actorRole: "cuidador",
      correctsId: dose.id,
    });
    expect(medicationCourseSchema.safeParse(merged.medication).success).toBe(
      true,
    );
    expect(mergeSharedMedicationEvents([merged], [shared])[0]).toBe(merged);
  });
  it("can pull a corrected remote occurrence without its earlier local history", () => {
    const corrected = {
      ...shared,
      payload: {
        eventId: "remote-correction",
        correctsId: "unknown-on-this-device",
      },
    };
    const [merged] = mergeSharedMedicationEvents([record], [corrected]);
    expect(merged.medication!.events[0]).toMatchObject({
      id: "remote-correction",
      correctsId: null,
    });
    expect(medicationCourseSchema.safeParse(merged.medication).success).toBe(
      true,
    );
  });
  it("ignores records from another pet and invalid medication dates", () => {
    expect(
      mergeSharedMedicationEvents(
        [record],
        [{ ...shared, petId: "another-pet" }],
      )[0],
    ).toBe(record);
    expect(
      mergeSharedMedicationEvents(
        [record],
        [{ ...shared, eventKey: "schedule-a:2020-01-01T08:00" }],
      )[0],
    ).toBe(record);
  });
});
