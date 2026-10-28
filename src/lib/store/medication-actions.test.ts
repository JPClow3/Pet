import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMedicationCourse } from "@/lib/domain/medication";
import { todayKey } from "@/lib/domain/dates";
import { buildReminders } from "@/lib/domain/reminders";
import type { MedicationPlanInput } from "@/lib/domain/schema";
import { useAppStore } from "./app-store";
import * as storage from "./storage";

const date = new Date().toISOString().slice(0, 10);
const plan: MedicationPlanInput = {
  amount: "1",
  unit: "mL",
  times: ["00:00", "23:59"],
  everyDays: 1,
  startsOn: date,
  endsOn: null,
  timeZone: "UTC",
  instructions: "Orientação recebida",
  source: "Receita da clínica",
};
const dose = {
  scheduleId: "plan",
  date,
  time: "00:00",
  status: "given" as const,
  expectedEventId: null,
};

async function setup() {
  const petId = await useAppStore
    .getState()
    .addPet({ name: "Luna", species: "cao", sex: "femea" });
  const id = await useAppStore
    .getState()
    .addRecord({
      petId,
      title: "Receita da Luna",
      type: "medicamento",
      date: todayKey(),
      nextDueDate: null,
      leadDays: 0,
      recurrenceMonths: null,
      professional: null,
      notes: null,
      attachmentData: null,
      attachmentName: null,
      weightKg: null,
      medication: createMedicationCourse(plan, "plan"),
    });
  return id;
}
const record = (id: string) =>
  useAppStore.getState().records.find((entry) => entry.id === id)!;

describe("ações duráveis de medicação", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await useAppStore.setState(useAppStore.getInitialState(), true);
  });
  it("serializa toques duplicados e preserva a dose ao salvar um formulário antigo", async () => {
    const id = await setup();
    const oldRecord = record(id);
    await Promise.all([
      useAppStore.getState().recordMedicationDose(id, dose),
      useAppStore.getState().recordMedicationDose(id, dose),
    ]);
    expect(record(id).medication?.events).toHaveLength(1);
    await useAppStore
      .getState()
      .updateRecord(id, { ...oldRecord, title: "Nome atualizado" });
    expect(record(id).title).toBe("Nome atualizado");
    expect(record(id).medication?.events).toHaveLength(1);
    const loaded = await storage.readPersistedState();
    expect(loaded?.records[0].medication?.events).toHaveLength(1);
  });
  it("rejeita plano e correção obsoletos sem apagar outro evento", async () => {
    const id = await setup();
    await useAppStore.getState().recordMedicationDose(id, dose);
    await expect(
      useAppStore
        .getState()
        .recordMedicationDose(id, { ...dose, status: "missed" }),
    ).rejects.toThrow(/outra tela/);
    await useAppStore
      .getState()
      .reviseMedicationPlan(id, "plan", { ...plan, amount: "2" });
    await expect(
      useAppStore.getState().reviseMedicationPlan(id, "plan", plan),
    ).rejects.toThrow(/plano mudou/);
    await expect(
      useAppStore.getState().endMedicationPlan(id, "plan"),
    ).rejects.toThrow(/plano mudou/);
    expect(record(id).medication?.schedules).toHaveLength(2);
    expect(record(id).medication?.events).toHaveLength(1);
  });
  it("não aceita concluir medicação como um cuidado genérico e preserva o histórico ao encerrar", async () => {
    const id = await setup();
    const item = buildReminders(useAppStore.getState()).find(
      (entry) => entry.id === id,
    )!;
    await expect(
      useAppStore.getState().completeReminderItem(item),
    ).rejects.toThrow(/plano de medicação/);
    await useAppStore.getState().recordMedicationDose(id, dose);
    await useAppStore.getState().endMedicationPlan(id, "plan");
    expect(record(id).medication?.activeScheduleId).toBeNull();
    expect(record(id).medication?.events).toHaveLength(1);
    expect(buildReminders(useAppStore.getState())).toHaveLength(0);
    await expect(
      useAppStore.getState().updateRecord(id, { type: "vacina" }),
    ).rejects.toThrow(/histórico de doses/);
  });
  it("não publica uma dose quando a gravação no aparelho falha", async () => {
    const id = await setup();
    vi.spyOn(storage, "writePersistedState").mockRejectedValueOnce(
      new Error("Espaço insuficiente"),
    );
    await expect(
      useAppStore.getState().recordMedicationDose(id, dose),
    ).rejects.toThrow(/Espaço/);
    expect(record(id).medication?.events).toEqual([]);
    await useAppStore.getState().recordMedicationDose(id, dose);
    expect(record(id).medication?.events).toHaveLength(1);
  });
});
