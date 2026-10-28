import { beforeEach, describe, expect, it } from "vitest";
import { addMonthsToKey, shiftDays, todayKey } from "@/lib/domain/dates";
import { buildReminders } from "@/lib/domain/reminders";
import { isoDate, isoDateTime } from "@/lib/domain/schema";
import { useAppStore } from "./app-store";

function pet(name = "Luna") {
  return useAppStore.getState().addPet({ name, species: "cao", sex: "femea" });
}

function care(petId: string, title = "Vacina") {
  return useAppStore.getState().addRecord({
    petId,
    type: "vacina",
    title,
    date: shiftDays(todayKey(), -365),
    nextDueDate: todayKey(),
    recurrenceMonths: 12,
    leadDays: 7,
    notes: null,
    professional: null,
    attachmentData: null,
    attachmentName: null,
    weightKg: null,
  });
}

function item(id: string) {
  const state = useAppStore.getState();
  return buildReminders({
    pets: state.pets,
    records: state.records,
    reminders: state.reminders,
    snoozes: state.snoozes,
  }).find((entry) => entry.id === id)!;
}

describe("ações de cuidado", () => {
  beforeEach(() => useAppStore.setState(useAppStore.getInitialState(), true));

  it("cria onboarding e primeiro cuidado juntos e valida tudo antes de alterar o estado", async () => {
    const initialRecord = {
      type: "vacina" as const,
      title: "Primeira vacina",
      date: todayKey(),
      nextDueDate: shiftDays(todayKey(), 30),
      leadDays: 7,
      recurrenceMonths: null,
      professional: null,
      notes: null,
      attachmentName: null,
      attachmentData: null,
      weightKg: null,
    };
    const input = {
      tutorName: "Ana",
      email: null,
      city: "São Paulo",
      focusAreas: ["saude" as const],
      pet: { name: "Luna", species: "cao" as const, sex: "femea" as const },
    };
    await expect(
      useAppStore.getState().completeOnboarding({
        ...input,
        initialRecord: { ...initialRecord, date: "2026-02-30" },
      }),
    ).rejects.toThrow();
    expect(useAppStore.getState().tutor).toBeNull();
    expect(useAppStore.getState().pets).toHaveLength(0);
    await useAppStore
      .getState()
      .completeOnboarding({ ...input, initialRecord });
    const state = useAppStore.getState();
    expect(state.records).toHaveLength(1);
    expect(state.records[0].petId).toBe(state.pets[0].id);
    await expect(
      useAppStore.getState().completeOnboarding(input),
    ).rejects.toThrow(/já foi criado/);
    expect(useAppStore.getState().records).toHaveLength(1);
  });

  it("conclui a mesma ocorrência apenas uma vez", async () => {
    const recordId = await care(await pet());
    const occurrence = item(recordId);
    expect(
      await useAppStore.getState().completeReminderItem(occurrence),
    ).not.toBeNull();
    expect(
      await useAppStore.getState().completeReminderItem(occurrence),
    ).toBeNull();
    expect(useAppStore.getState().records).toHaveLength(2);
    expect(buildReminders(useAppStore.getState())).toHaveLength(1);
  });

  it("desfaz um cuidado sem desfazer outro ou perder registros novos", async () => {
    const petId = await pet();
    const a = await care(petId, "A");
    const b = await care(petId, "B");
    const undoA = (await useAppStore.getState().completeReminderItem(item(a)))!;
    await useAppStore.getState().completeReminderItem(item(b));
    const c = await care(petId, "C");
    await useAppStore.getState().undoCareAction(undoA);
    const state = useAppStore.getState();
    expect(state.records.find((record) => record.id === a)?.nextDueDate).toBe(
      todayKey(),
    );
    expect(
      state.records.find((record) => record.id === b)?.completedAt,
    ).toBeTruthy();
    expect(state.records.find((record) => record.id === c)).toBeDefined();
    expect(state.records).toHaveLength(4);
  });

  it("não desfaz uma ocorrência modificada depois da conclusão", async () => {
    const recordId = await care(await pet());
    const undo = (await useAppStore
      .getState()
      .completeReminderItem(item(recordId)))!;
    const generated = useAppStore
      .getState()
      .records.find((record) => record.id !== recordId)!;
    await useAppStore
      .getState()
      .updateRecord(generated.id, { title: "Correção posterior" });
    await expect(useAppStore.getState().undoCareAction(undo)).rejects.toThrow(
      /alterado depois/,
    );
    expect(
      useAppStore
        .getState()
        .records.find((record) => record.id === generated.id)?.title,
    ).toBe("Correção posterior");
  });

  it("reagenda a data real e recusa uma ação baseada na data anterior", async () => {
    const recordId = await care(await pet());
    const original = item(recordId);
    await useAppStore.getState().snoozeReminderItem(original, 3);
    await useAppStore
      .getState()
      .rescheduleReminderItem(original, shiftDays(todayKey(), 10));
    expect(useAppStore.getState().records[0].nextDueDate).toBe(
      shiftDays(todayKey(), 10),
    );
    expect(useAppStore.getState().snoozes[original.key]).toBeUndefined();
    await expect(
      useAppStore.getState().completeReminderItem(original),
    ).rejects.toThrow(/mudou/);
    expect(useAppStore.getState().records).toHaveLength(1);
  });

  it("pula e encerra recorrência sem registrar cuidado realizado", async () => {
    const recordId = await care(await pet());
    const undo = await useAppStore
      .getState()
      .skipReminderOccurrence(item(recordId));
    expect(useAppStore.getState().records[0].nextDueDate).toBe(
      addMonthsToKey(todayKey(), 12),
    );
    expect(useAppStore.getState().records[0].completedAt).toBeNull();
    await useAppStore.getState().undoCareAction(undo);
    const stop = await useAppStore
      .getState()
      .stopReminderRecurrence(item(recordId));
    expect(useAppStore.getState().records[0].nextDueDate).toBeNull();
    expect(useAppStore.getState().records[0].recurrenceMonths).toBeNull();
    await useAppStore.getState().undoCareAction(stop);
    expect(item(recordId)).toBeDefined();
  });

  it("retira avisos concluídos ou adiados e restaura avisos ao desfazer", async () => {
    const recordId = await care(await pet());
    const original = item(recordId);
    expect(
      useAppStore
        .getState()
        .notifications.some((notification) =>
          notification.id.includes(recordId),
        ),
    ).toBe(true);
    const undo = await useAppStore.getState().snoozeReminderItem(original, 3);
    await useAppStore.getState().sweepNotifications();
    expect(
      useAppStore
        .getState()
        .notifications.some((notification) =>
          notification.id.includes(recordId),
        ),
    ).toBe(false);
    await useAppStore.getState().undoCareAction(undo);
    expect(
      useAppStore
        .getState()
        .notifications.some((notification) =>
          notification.id.includes(recordId),
        ),
    ).toBe(true);
    await useAppStore.getState().completeReminderItem(original);
    expect(
      useAppStore
        .getState()
        .notifications.some((notification) =>
          notification.id.includes(recordId),
        ),
    ).toBe(false);
  });

  it("permite criar, editar, concluir, reabrir e excluir lembrete manual", async () => {
    const petId = await pet();
    const id = await useAppStore.getState().addReminder({
      petId,
      title: "Banho",
      kind: "rotina",
      dueDate: todayKey(),
      leadDays: 1,
      notes: null,
    });
    await useAppStore.getState().updateReminder(id, { title: "Banho e tosa" });
    await useAppStore.getState().completeReminderItem(item(id));
    expect(useAppStore.getState().reminders[0].completedAt).toBeTruthy();
    await useAppStore
      .getState()
      .updateReminder(id, { done: false, completedAt: null });
    expect(item(id).title).toBe("Banho e tosa");
    await useAppStore.getState().removeReminder(id);
    expect(useAppStore.getState().reminders).toHaveLength(0);
  });

  it("valida calendário e recusa alteração da identidade do registro", async () => {
    expect(isoDate.safeParse("2026-02-30").success).toBe(false);
    expect(isoDate.safeParse("2028-02-29").success).toBe(true);
    expect(isoDateTime.safeParse("not-a-timestamp").success).toBe(false);
    expect(isoDateTime.safeParse("2026-10-25T12:00:00-03:00").success).toBe(
      true,
    );
    const petId = await pet();
    const other = await pet("Thor");
    const id = await care(petId);
    await useAppStore.getState().updateRecord(id, { petId: other });
    expect(useAppStore.getState().records[0].petId).toBe(petId);
    await expect(
      useAppStore.getState().updateRecord(id, { date: "" }),
    ).rejects.toThrow();
    await expect(
      useAppStore.getState().updateRecord(id, { weightKg: Infinity }),
    ).rejects.toThrow();
    await expect(
      useAppStore.getState().updateRecord(id, { weightKg: 121 }),
    ).rejects.toThrow();
    await expect(
      useAppStore.getState().updateRecord(id, { type: "peso", weightKg: null }),
    ).rejects.toThrow();
  });
});
