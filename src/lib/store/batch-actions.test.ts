import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./app-store";

async function resetStore() {
  await useAppStore.setState(useAppStore.getInitialState(), true);
}

describe("batchRecordCare and undoBatchCare", () => {
  beforeEach(async () => {
    await resetStore();
  });

  it("registers care for multiple pets in one batch and allows undo", async () => {
    const p1 = await useAppStore.getState().addPet({
      name: "Thor",
      species: "cao",
      sex: "macho",
    });
    const p2 = await useAppStore.getState().addPet({
      name: "Luna",
      species: "cao",
      sex: "femea",
    });
    const p3 = await useAppStore.getState().addPet({
      name: "Mia",
      species: "gato",
      sex: "femea",
    });

    // Add a reminder for Thor
    const reminderThor = await useAppStore.getState().addReminder({
      petId: p1,
      title: "Passeio matinal",
      kind: "rotina",
      dueDate: "2026-10-28",
      leadDays: 0,
      notes: null,
    });

    // Batch action for Thor and Luna only
    const undo = await useAppStore.getState().batchRecordCare({
      petIds: [p1, p2],
      title: "Passeio matinal",
      notes: "Passeio no parque",
    });

    expect(undo.recordIds.length).toBe(2);
    expect(undo.completedReminderIds).toContain(reminderThor);

    const state = useAppStore.getState();
    const thorRecord = state.records.find((r) => r.petId === p1 && r.title === "Passeio matinal");
    const lunaRecord = state.records.find((r) => r.petId === p2 && r.title === "Passeio matinal");
    const miaRecord = state.records.find((r) => r.petId === p3 && r.title === "Passeio matinal");

    expect(thorRecord).toBeDefined();
    expect(lunaRecord).toBeDefined();
    expect(miaRecord).toBeUndefined();

    // Reminder was marked done
    const updatedReminder = state.reminders.find((rem) => rem.id === reminderThor);
    expect(updatedReminder?.done).toBe(true);

    // Now test undo
    await useAppStore.getState().undoBatchCare(undo);

    const postUndoState = useAppStore.getState();
    expect(postUndoState.records.find((r) => r.petId === p1 && r.title === "Passeio matinal")).toBeUndefined();
    expect(postUndoState.records.find((r) => r.petId === p2 && r.title === "Passeio matinal")).toBeUndefined();
    expect(postUndoState.reminders.find((rem) => rem.id === reminderThor)?.done).toBe(false);
  });

  it("throws if no valid pets selected", async () => {
    await expect(
      useAppStore.getState().batchRecordCare({
        petIds: ["non-existent"],
        title: "Alimentação",
      }),
    ).rejects.toThrow("Selecione ao menos um pet válido.");
  });

  it("throws if title is empty or only whitespace", async () => {
    const p1 = await useAppStore.getState().addPet({
      name: "Thor",
      species: "cao",
      sex: "macho",
    });
    await expect(
      useAppStore.getState().batchRecordCare({
        petIds: [p1],
        title: "   ",
      }),
    ).rejects.toThrow("Informe o nome do cuidado compartilhado.");
  });

  it("deduplicates repeated petIds and cleans up snoozes for completed reminders", async () => {
    const p1 = await useAppStore.getState().addPet({
      name: "Thor",
      species: "cao",
      sex: "macho",
    });
    const reminderId = await useAppStore.getState().addReminder({
      petId: p1,
      title: "Alimentação",
      kind: "rotina",
      dueDate: "2026-10-28",
      leadDays: 0,
      notes: null,
    });
    // Set a snooze on this reminder
    useAppStore.setState({
      snoozes: { [`manual:${reminderId}`]: "2026-10-29" },
    });

    const undo = await useAppStore.getState().batchRecordCare({
      petIds: [p1, p1, p1], // duplicate IDs passed
      title: "Alimentação",
    });

    // Should only have created 1 record despite 3 identical IDs in input
    expect(undo.recordIds.length).toBe(1);

    // Snooze should be cleared
    expect(useAppStore.getState().snoozes[`manual:${reminderId}`]).toBeUndefined();
  });
});
