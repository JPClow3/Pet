import { describe, expect, it } from "vitest";
import type { DiaryEntry, HealthRecord, Pet } from "./schema";
import { petWeightMeasurements, reconcileWeights } from "./weight";

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
