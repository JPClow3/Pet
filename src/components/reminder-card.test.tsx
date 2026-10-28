import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ReminderCard } from "@/components/reminder-card";
import { addMonthsToKey, shiftDays, todayKey } from "@/lib/domain/dates";
import { createMedicationCourse } from "@/lib/domain/medication";
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

  it("exibe mini-cronograma visual das próximas 24 horas e permite registrar dose em 1 toque", async () => {
    const user = userEvent.setup();
    const petId = await useAppStore
      .getState()
      .addPet({ name: "Luna", species: "cao", sex: "femea" });
    const medPlan = {
      amount: "1",
      unit: "comprimido",
      times: ["08:00", "20:00"],
      everyDays: 1,
      startsOn: todayKey(),
      endsOn: null,
      instructions: "Tomar junto com a comida",
      source: "Dra. Ana",
      timeZone: "America/Sao_Paulo",
    };
    const recordId = await useAppStore.getState().addRecord({
      petId,
      type: "medicamento",
      title: "Antibiótico",
      date: todayKey(),
      nextDueDate: null,
      leadDays: 0,
      recurrenceMonths: null,
      professional: null,
      notes: null,
      attachmentName: null,
      attachmentData: null,
      weightKg: null,
      medication: createMedicationCourse(medPlan, "plan-1"),
    });

    const record = useAppStore
      .getState()
      .records.find((r) => r.id === recordId)!;
    const scheduleId = record.medication!.activeScheduleId!;

    const item: ReminderItem = {
      key: `medicamento:${recordId}:dose1`,
      source: "medicamento",
      id: recordId,
      petId,
      petName: "Luna",
      title: "Antibiótico",
      dueDate: todayKey(),
      leadDays: 0,
      days: 0,
      urgency: "vencido",
      notes: null,
      snoozedUntil: null,
      reason: "Horário planejado",
      medication: {
        scheduleId,
        time: "08:00",
        timeZone: "America/Sao_Paulo",
        amount: "1",
        unit: "comprimido",
        eventId: null,
        due: true,
      },
    };

    render(<ReminderCard item={item} />);

    expect(screen.getByText("Próximas 24 horas")).toBeInTheDocument();
    expect(screen.getAllByText("08:00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("20:00")).toBeInTheDocument();

    const doseButtons = screen.getAllByRole("button", {
      name: /dose dada|dar dose/i,
    });
    expect(doseButtons.length).toBeGreaterThan(0);
    await user.click(doseButtons[0]);

    await waitFor(() => {
      const updatedRecord = useAppStore
        .getState()
        .records.find((r) => r.id === recordId)!;
      const givenEvent = updatedRecord.medication?.events.find(
        (e) => e.status === "given",
      );
      expect(givenEvent).toBeDefined();
    });
  });

  it("identifica doses de amanhã e estados de dose pulada ou não dada no mini-cronograma", async () => {
    const petId = await useAppStore
      .getState()
      .addPet({ name: "Luna", species: "cao", sex: "femea" });
    const medPlan = {
      amount: "1",
      unit: "comprimido",
      times: ["08:00", "20:00"],
      everyDays: 1,
      startsOn: todayKey(),
      endsOn: null,
      instructions: "Com água",
      source: "Vet",
      timeZone: "America/Sao_Paulo",
    };
    let course = createMedicationCourse(medPlan, "plan-1");
    // Add a missed dose event for 08:00 today
    course = {
      ...course,
      events: [
        {
          id: "event-missed",
          scheduleId: "plan-1",
          date: todayKey(),
          time: "08:00",
          status: "missed",
          recordedAt: new Date().toISOString(),
          note: null,
          correctsId: null,
        },
      ],
    };

    const recordId = await useAppStore.getState().addRecord({
      petId,
      type: "medicamento",
      title: "Antibiótico",
      date: todayKey(),
      nextDueDate: null,
      leadDays: 0,
      recurrenceMonths: null,
      professional: null,
      notes: null,
      attachmentName: null,
      attachmentData: null,
      weightKg: null,
      medication: course,
    });

    const item: ReminderItem = {
      key: `medicamento:${recordId}:dose2`,
      source: "medicamento",
      id: recordId,
      petId,
      petName: "Luna",
      title: "Antibiótico",
      dueDate: todayKey(),
      leadDays: 0,
      days: 0,
      urgency: "hoje",
      notes: null,
      snoozedUntil: null,
      reason: "Horário planejado",
      medication: {
        scheduleId: "plan-1",
        time: "20:00",
        timeZone: "America/Sao_Paulo",
        amount: "1",
        unit: "comprimido",
        eventId: null,
        due: false,
      },
    };

    render(<ReminderCard item={item} />);

    // Missed dose from this morning should show "Não dada", not "Planejada"
    expect(screen.getByText("Não dada")).toBeInTheDocument();

    // Tomorrow's dose should be labeled "Amanhã 08:00"
    expect(screen.getByText("Amanhã 08:00")).toBeInTheDocument();
  });
});
