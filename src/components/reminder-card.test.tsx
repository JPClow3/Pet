import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ReminderCard } from "@/components/reminder-card";
import { addMonthsToKey, shiftDays, todayKey } from "@/lib/domain/dates";
import type { ReminderItem } from "@/lib/domain/reminders";
import { useAppStore } from "@/lib/store/app-store";

async function resetStore() {
  await useAppStore.setState(useAppStore.getInitialState(), true);
}

async function createPetWithVaccine() {
  const petId = await useAppStore.getState().addPet({
    name: "Thor",
    species: "cao",
    sex: "macho",
  });
  const recordId = await useAppStore.getState().addRecord({
    petId,
    type: "vacina",
    title: "Vacina V10",
    date: "2025-09-20",
    nextDueDate: shiftDays(todayKey(), -3),
    leadDays: 30,
    recurrenceMonths: 12,
    professional: null,
    notes: null,
    attachmentName: null,
    attachmentData: null,
    weightKg: null,
  });
  return { petId, recordId };
}

function buildItem(overrides: Partial<ReminderItem> = {}): ReminderItem {
  return {
    key: "registro:record-1",
    source: "registro",
    id: "record-1",
    petId: "pet-1",
    petName: "Thor",
    title: "Vacina V10",
    dueDate: shiftDays(todayKey(), -3),
    leadDays: 30,
    days: -3,
    urgency: "vencido",
    notes: null,
    snoozedUntil: null,
    reason: "Aviso do registro de saúde",
    ...overrides,
  };
}

describe("ReminderCard", () => {
  beforeEach(async () => {
    await resetStore();
  });

  it("mostra a urgência e o prazo do cuidado", () => {
    render(<ReminderCard item={buildItem()} showPet={false} />);
    expect(
      screen.getByRole("heading", { name: "Vacina V10" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/vencido/i)).toBeInTheDocument();
    expect(screen.getByText(/venceu há 3 dias/i)).toBeInTheDocument();
  });

  it("conclui o cuidado criando o próximo ciclo no histórico", async () => {
    const user = userEvent.setup();
    const { recordId } = await createPetWithVaccine();
    const record = useAppStore
      .getState()
      .records.find((item) => item.id === recordId);
    const item = buildItem({
      id: recordId,
      petId: record?.petId ?? "pet-1",
      dueDate: record?.nextDueDate ?? todayKey(),
      days: -3,
      urgency: "vencido",
    });

    render(<ReminderCard item={item} />);
    await user.click(screen.getByRole("button", { name: /concluir/i }));
    await waitFor(() =>
      expect(
        useAppStore.getState().records.find((entry) => entry.id === recordId)
          ?.nextDueDate,
      ).toBeNull(),
    );

    const state = useAppStore.getState();
    const original = state.records.find((entry) => entry.id === recordId);
    const created = state.records.find((entry) => entry.id !== recordId);
    expect(original?.nextDueDate).toBeNull();
    expect(original?.completedAt).not.toBeNull();
    expect(created?.date).toBe(todayKey());
    expect(created?.nextDueDate).toBe(addMonthsToKey(todayKey(), 12));
  });

  it("adia o lembrete por uma semana", async () => {
    const user = userEvent.setup();
    const petId = await useAppStore
      .getState()
      .addPet({ name: "Thor", species: "cao", sex: "macho" });
    const reminderId = await useAppStore.getState().addReminder({
      petId,
      title: "Comprar ração",
      kind: "rotina",
      dueDate: todayKey(),
      leadDays: 1,
      notes: null,
    });
    const item = buildItem({
      key: `manual:${reminderId}`,
      source: "manual",
      id: reminderId,
      petId,
      dueDate: todayKey(),
    });

    render(<ReminderCard item={item} />);
    await user.click(screen.getByRole("button", { name: /adiar/i }));
    await user.click(screen.getByRole("button", { name: /adiar 1 semana/i }));
    await waitFor(() =>
      expect(useAppStore.getState().snoozes[`manual:${reminderId}`]).toBe(
        shiftDays(todayKey(), 7),
      ),
    );

    const state = useAppStore.getState();
    expect(state.snoozes[`manual:${reminderId}`]).toBe(
      shiftDays(todayKey(), 7),
    );
  });
});
