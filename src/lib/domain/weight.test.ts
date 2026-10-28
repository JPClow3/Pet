import { describe, expect, it } from "vitest";
import type { DiaryEntry, HealthRecord, Pet } from "./schema";
import {
  detectSuddenWeightChange,
  petWeightMeasurements,
  reconcileWeights,
} from "./weight";

describe("ordenação de pesagens importadas", () => {
  it("compara o instante real de fusos diferentes entre saúde, diário e perfil", () => {
    const pet: Pet = {
      id: "luna",
      name: "Luna",
      species: "cao",
      sex: "femea",
      breed: null,
      birthDate: null,
      weightKg: 12,
      photo: null,
      color: null,
      microchip: null,
      notes: null,
      routine: [],
      card: {
        shareBreed: false,
        shareCity: false,
        shareHealth: false,
        contact: null,
      },
      lostMode: { active: false, since: null, note: null },
      createdAt: "2026-10-25T10:00:00Z",
      updatedAt: "2026-10-25T14:00:00Z",
      weightBaseline: {
        weightKg: 12,
        date: "2026-10-25",
        updatedAt: "2026-10-25T18:00:00+04:00",
      },
    };
    const record: HealthRecord = {
      id: "health",
      petId: pet.id,
      type: "peso",
      title: "Pesagem",
      date: "2026-10-25",
      nextDueDate: null,
      leadDays: 0,
      recurrenceMonths: null,
      professional: null,
      notes: null,
      attachmentName: null,
      attachmentData: null,
      weightKg: 10,
      completedAt: null,
      createdAt: "2026-10-25T13:00:00Z",
    };
    const diary: DiaryEntry = {
      id: "diary",
      petId: pet.id,
      date: "2026-10-25",
      text: "Pesagem atualizada",
      photo: null,
      tags: [],
      place: null,
      weightKg: 11,
      visibility: "privado",
      createdAt: "2026-10-25T11:00:00Z",
      weightUpdatedAt: "2026-10-25T12:00:00-03:00",
    };
    expect(
      petWeightMeasurements(pet, [record], [diary]).map(
        (entry) => entry.weightKg,
      ),
    ).toEqual([10, 12, 11]);
    const state = { pets: [pet], records: [record], diary: [diary] };
    expect(reconcileWeights(state, {}, [pet.id]).pets[0].weightKg).toBe(11);
  });
});

describe("detectSuddenWeightChange", () => {
  it("returns null when fewer than 2 measurements", () => {
    expect(detectSuddenWeightChange([])).toBeNull();
    expect(detectSuddenWeightChange([{ date: "2026-01-01", weightKg: 10 }])).toBeNull();
  });

  it("returns null when weight change is stable or under threshold", () => {
    const measurements = [
      { date: "2026-01-01", weightKg: 10 },
      { date: "2026-02-01", weightKg: 10.2 },
    ];
    expect(detectSuddenWeightChange(measurements, 5)).toBeNull();
  });

  it("detects sudden weight loss greater than threshold", () => {
    const measurements = [
      { date: "2026-01-01", weightKg: 10 },
      { date: "2026-01-20", weightKg: 9.1 }, // 9% drop
    ];
    const alert = detectSuddenWeightChange(measurements, 5);
    expect(alert).not.toBeNull();
    expect(alert?.type).toBe("loss");
    expect(alert?.percentage).toBe(9);
    expect(alert?.deltaKg).toBe(-0.9);
  });

  it("detects sudden weight gain greater than threshold", () => {
    const measurements = [
      { date: "2026-01-01", weightKg: 10 },
      { date: "2026-02-01", weightKg: 11.2 }, // 12% increase
    ];
    const alert = detectSuddenWeightChange(measurements, 5);
    expect(alert).not.toBeNull();
    expect(alert?.type).toBe("gain");
    expect(alert?.percentage).toBe(12);
    expect(alert?.deltaKg).toBe(1.2);
  });

  it("ignores changes beyond maxDays", () => {
    const measurements = [
      { date: "2025-01-01", weightKg: 10 },
      { date: "2026-01-01", weightKg: 8.5 }, // 365 days apart
    ];
    expect(detectSuddenWeightChange(measurements, 5, 90)).toBeNull();
  });

  it("does not trigger false alarm for multiple measurements on the same day", () => {
    const measurements = [
      { date: "2026-01-01", weightKg: 10 },
      { date: "2026-01-01", weightKg: 11 }, // typo correction on same day
    ];
    expect(detectSuddenWeightChange(measurements, 5)).toBeNull();
  });

  it("deduplicates same-day entries and compares across distinct dates", () => {
    const measurements = [
      { date: "2026-01-01", weightKg: 10 },
      { date: "2026-01-10", weightKg: 10.1 },
      { date: "2026-01-10", weightKg: 9.0 }, // corrected to 9.0 on day 10 (10% drop vs day 1)
    ];
    const alert = detectSuddenWeightChange(measurements, 5);
    expect(alert).not.toBeNull();
    expect(alert?.type).toBe("loss");
    expect(alert?.percentage).toBe(10);
    expect(alert?.days).toBe(9);
  });
});

