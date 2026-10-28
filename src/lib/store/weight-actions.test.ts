import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shiftDays, todayKey } from "@/lib/domain/dates";
import { useAppStore } from "./app-store";

function measure(petId: string, weightKg: number, days = 0) {
  return useAppStore.getState().addRecord({
    petId,
    type: "peso",
    title: "Pesagem",
    date: shiftDays(todayKey(), days),
    nextDueDate: null,
    leadDays: 0,
    recurrenceMonths: null,
    notes: null,
    professional: null,
    attachmentData: null,
    attachmentName: null,
    weightKg,
  });
}

function moment(petId: string, weightKg: number, days = 0) {
  return useAppStore.getState().addDiaryEntry({
    petId,
    date: shiftDays(todayKey(), days),
    text: "Peso no diário",
    weightKg,
    photo: null,
    tags: [],
    place: null,
    visibility: "privado",
  });
}

describe("peso atual do pet", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T12:00:00Z"));
    await useAppStore.setState(useAppStore.getInitialState(), true);
  });
  afterEach(() => vi.useRealTimers());

  it("preserva peso do perfil contra lançamentos antigos e usa a última edição no mesmo dia", async () => {
    const petId = await useAppStore
      .getState()
      .addPet({ name: "Luna", species: "cao", sex: "femea", weightKg: 30 });
    await measure(petId, 20, -10);
    expect(useAppStore.getState().pets[0].weightKg).toBe(30);
    const health = await measure(petId, 31);
    expect(useAppStore.getState().pets[0].weightKg).toBe(31);
    const diary = await moment(petId, 32);
    expect(useAppStore.getState().pets[0].weightKg).toBe(32);
    await useAppStore.getState().updateRecord(health, { weightKg: 33 });
    expect(useAppStore.getState().pets[0].weightKg).toBe(33);
    await useAppStore.getState().removeRecord(health);
    expect(useAppStore.getState().pets[0].weightKg).toBe(32);
    await useAppStore.getState().removeDiaryEntry(diary);
    expect(useAppStore.getState().pets[0].weightKg).toBe(30);
  });

  it("recalcula após corrigir datas, editar e excluir peso no diário", async () => {
    const petId = await useAppStore
      .getState()
      .addPet({ name: "Luna", species: "cao", sex: "femea" });
    const older = await measure(petId, 20, -10);
    const recent = await moment(petId, 22, -1);
    const oldest = await measure(petId, 18, -20);
    expect(useAppStore.getState().pets[0].weightKg).toBe(22);
    await useAppStore.getState().updateDiaryEntry(recent, { weightKg: 23 });
    expect(useAppStore.getState().pets[0].weightKg).toBe(23);
    await useAppStore
      .getState()
      .updateDiaryEntry(recent, { date: shiftDays(todayKey(), -30) });
    expect(useAppStore.getState().pets[0].weightKg).toBe(20);
    await useAppStore.getState().removeRecord(older);
    expect(useAppStore.getState().pets[0].weightKg).toBe(18);
    await useAppStore.getState().removeRecord(oldest);
    expect(useAppStore.getState().pets[0].weightKg).toBe(23);
    await useAppStore.getState().removeDiaryEntry(recent);
    expect(useAppStore.getState().pets[0].weightKg).toBeNull();
  });

  it("respeita correção explícita de perfil, inclusive remoção, e isola pets", async () => {
    const petId = await useAppStore
      .getState()
      .addPet({ name: "Luna", species: "cao", sex: "femea" });
    const other = await useAppStore
      .getState()
      .addPet({ name: "Thor", species: "cao", sex: "macho", weightKg: 40 });
    await measure(petId, 12);
    await useAppStore.getState().updatePet(petId, { weightKg: 13 });
    expect(useAppStore.getState().pets[0].weightKg).toBe(13);
    await useAppStore.getState().updatePet(petId, { name: "Luninha" });
    expect(useAppStore.getState().pets[0].weightKg).toBe(13);
    await useAppStore.getState().updatePet(petId, { weightKg: null });
    expect(useAppStore.getState().pets[0].weightKg).toBeNull();
    await moment(petId, 14);
    expect(useAppStore.getState().pets[0].weightKg).toBe(14);
    expect(
      useAppStore.getState().pets.find((pet) => pet.id === other)?.weightKg,
    ).toBe(40);
  });

  it("reconcilia pets antigos com histórico e preserva os que só tinham peso no perfil", async () => {
    const petId = await useAppStore
      .getState()
      .addPet({ name: "Luna", species: "cao", sex: "femea" });
    const recordId = await measure(petId, 12, -1);
    await useAppStore.setState((state) => ({
      pets: state.pets.map((pet) => ({
        ...pet,
        weightKg: 10,
        weightBaseline: undefined,
      })),
    }));
    await useAppStore
      .getState()
      .updateRecord(recordId, { notes: "Correção de anotação" });
    expect(useAppStore.getState().pets[0].weightKg).toBe(12);
    const other = await useAppStore
      .getState()
      .addPet({ name: "Thor", species: "cao", sex: "macho", weightKg: 40 });
    await useAppStore.setState((state) => ({
      pets: state.pets.map((pet) =>
        pet.id === other ? { ...pet, weightBaseline: undefined } : pet,
      ),
    }));
    await measure(other, 30, -30);
    expect(
      useAppStore.getState().pets.find((pet) => pet.id === other)?.weightKg,
    ).toBe(40);
  });
});
