import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RemindersPage from "@/app/(app)/reminders/page";
import { buildReminders } from "@/lib/domain/reminders";
import { todayKey, shiftDays } from "@/lib/domain/dates";
import { useAppStore } from "@/lib/store/app-store";

describe("agenda", () => {
  beforeEach(async () => {
    await useAppStore.setState(useAppStore.getInitialState(), true);
    useAppStore.getState().markReady();
    await useAppStore
      .getState()
      .addPet({ name: "Luna", species: "cao", sex: "femea" });
  });

  it("cria um lembrete de rotina a partir da agenda e permite editar e excluir", async () => {
    const user = userEvent.setup();
    render(<RemindersPage />);
    await user.click(screen.getByRole("button", { name: "Criar lembrete" }));
    await user.type(screen.getByLabelText("Nome do lembrete"), "Comprar ração");
    fireEvent.change(screen.getByLabelText("Data"), {
      target: { value: shiftDays(todayKey(), 3) },
    });
    await user.click(screen.getByRole("button", { name: "Criar lembrete" }));
    await waitFor(() =>
      expect(useAppStore.getState().reminders[0]?.title).toBe("Comprar ração"),
    );
    await user.click(
      await screen.findByRole("button", { name: "Editar lembrete" }),
    );
    const title = screen.getByLabelText("Nome do lembrete");
    await user.clear(title);
    await user.type(title, "Comprar ração da Luna");
    await user.click(screen.getByRole("button", { name: "Salvar lembrete" }));
    await waitFor(() =>
      expect(useAppStore.getState().reminders[0].title).toBe(
        "Comprar ração da Luna",
      ),
    );
    await user.click(
      await screen.findByRole("button", { name: "Editar lembrete" }),
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Excluir lembrete" }));
    confirm.mockRestore();
    await waitFor(() =>
      expect(useAppStore.getState().reminders).toHaveLength(0),
    );
  });

  it("mostra cuidados de saúde concluídos junto com lembretes manuais", async () => {
    const user = userEvent.setup();
    const petId = useAppStore.getState().pets[0].id;
    await useAppStore.getState().addRecord({
      petId,
      type: "vacina",
      title: "V10 da Luna",
      date: shiftDays(todayKey(), -365),
      nextDueDate: todayKey(),
      leadDays: 7,
      recurrenceMonths: 12,
      professional: null,
      notes: null,
      attachmentName: null,
      attachmentData: null,
      weightKg: null,
    });
    await useAppStore.getState().addReminder({
      petId,
      title: "Banho da Luna",
      kind: "rotina",
      dueDate: todayKey(),
      leadDays: 1,
      notes: null,
    });
    for (const item of buildReminders(useAppStore.getState()))
      await useAppStore.getState().completeReminderItem(item);
    render(<RemindersPage />);
    await user.click(screen.getByRole("button", { name: "Concluídos" }));
    expect(
      screen.getByRole("link", { name: "V10 da Luna" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Banho da Luna")).toBeInTheDocument();
    expect(screen.getAllByText(/Concluído em/)).toHaveLength(2);
  });
});
