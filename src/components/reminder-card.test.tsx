import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ReminderCard } from "@/components/reminder-card";
import { addMonthsToKey, shiftDays, todayKey } from "@/lib/domain/dates";
import type { ReminderItem } from "@/lib/domain/reminders";
import { useAppStore } from "@/lib/store/app-store";

function resetStore() {
  useAppStore.setState(useAppStore.getInitialState(), true);
}

function createPetWithVaccine() {
  const petId = useAppStore.getState().addPet({
    name: "Thor",
    species: "cao",
    sex: "macho",
  });
  const recordId = useAppStore.getState().addRecord({
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
  beforeEach(() => {
    resetStore();
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
    const { recordId } = createPetWithVaccine();
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
    const item = buildItem({
      key: "manual:reminder-1",
      source: "manual",
      id: "reminder-1",
    });

    render(<ReminderCard item={item} />);
    await user.click(screen.getByRole("button", { name: /adiar/i }));
    await user.click(screen.getByRole("button", { name: /adiar 1 semana/i }));

    const state = useAppStore.getState();
    expect(state.snoozes["manual:reminder-1"]).toBe(shiftDays(todayKey(), 7));
  });
});
