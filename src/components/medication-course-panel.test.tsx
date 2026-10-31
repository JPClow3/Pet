import "fake-indexeddb/auto";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MedicationCoursePanel } from "./medication-course-panel";
import { RecordForm } from "./record-form";
import { createMedicationCourse } from "@/lib/domain/medication";
import { todayKey } from "@/lib/domain/dates";
import { useAppStore } from "@/lib/store/app-store";

const date = new Date().toISOString().slice(0, 10);
const plan = {
  amount: "0,5",
  unit: "mL",
  times: ["00:00", "23:59"],
  everyDays: 1,
  startsOn: date,
  endsOn: null,
  timeZone: "UTC",
  instructions: "Receita transcrita",
  source: "Clínica da Luna",
};
function CurrentCourse({ id }: { id: string }) {
  const record = useAppStore((state) =>
    state.records.find((entry) => entry.id === id)!,
  );
  return <MedicationCoursePanel record={record} />;
}

describe("fluxo de medicação", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    await useAppStore.setState(useAppStore.getInitialState(), true);
  });
  it("mantém medicação genérica legada editável sem inventar dose ou plano", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    const legacy = {
      id: "legacy",
      petId: "luna",
      type: "medicamento" as const,
      title: "Registro antigo",
      date: todayKey(),
      nextDueDate: null,
      leadDays: 0,
      recurrenceMonths: null,
      professional: null,
      notes: "Conforme a receita antiga",
      attachmentData: null,
      attachmentName: null,
      weightKg: null,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    render(
      <RecordForm
        petId="luna"
        petName="Luna"
        initial={legacy}
        submitLabel="Salvar"
        onSubmit={save}
      />,
    );
    expect(
      screen.queryByLabelText("Quantidade por dose"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Novo plano de medicação" }),
    ).toHaveAttribute("href", "/pets/luna/health/new?type=medicamento");
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Nome do cuidado"), {
      target: { value: "Registro corrigido" },
    });
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Registro corrigido",
        medication: null,
        notes: "Conforme a receita antiga",
      }),
    );
  });
  it("cria o plano somente com a quantidade, horários e origem informados", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(
      <RecordForm
        petId="luna"
        petName="Luna"
        initialType="medicamento"
        submitLabel="Salvar"
        onSubmit={save}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/quantidade/);
    fireEvent.change(screen.getByLabelText("Quantidade por dose"), {
      target: { value: "0,5" },
    });
    fireEvent.change(screen.getByLabelText("Unidade da dose"), {
      target: { value: "mL" },
    });
    fireEvent.change(screen.getByLabelText("Horários planejados"), {
      target: { value: "08:00, 20:00" },
    });
    fireEvent.change(screen.getByLabelText("Origem da prescrição"), {
      target: { value: "Clínica da Luna" },
    });
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        nextDueDate: null,
        recurrenceMonths: null,
        medication: expect.objectContaining({
          events: [],
          schedules: [
            expect.objectContaining({
              amount: "0,5",
              unit: "mL",
              times: ["08:00", "20:00"],
              source: "Clínica da Luna",
            }),
          ],
        }),
      }),
    );
  });
  it("registra, corrige, edita o plano e encerra mantendo o histórico", async () => {
    const user = userEvent.setup();
    const petId = await useAppStore
      .getState()
      .addPet({ name: "Luna", species: "cao", sex: "femea" });
    const id = await useAppStore.getState().addRecord({
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
    render(<CurrentCourse id={id} />);
    await user.click(screen.getByRole("button", { name: "Dose dada" }));
    await screen.findByRole("button", { name: "Corrigir registro das 00:00" });
    await user.click(
      screen.getByRole("button", { name: "Corrigir registro das 00:00" }),
    );
    await user.selectOptions(
      screen.getByLabelText("Situação da dose das 00:00"),
      "missed",
    );
    await user.type(
      screen.getByLabelText("Observação sobre este registro"),
      "Confirmação por engano",
    );
    await user.click(
      screen.getByRole("button", { name: "Salvar situação da dose" }),
    );
    await waitFor(() =>
      expect(useAppStore.getState().records[0].medication?.events).toHaveLength(
        2,
      ),
    );
    expect(
      useAppStore.getState().records[0].medication?.events[1],
    ).toMatchObject({ status: "missed", note: "Confirmação por engano" });
    await user.click(screen.getByRole("button", { name: "Editar plano" }));
    fireEvent.change(screen.getByLabelText("Quantidade por dose"), {
      target: { value: "1" },
    });
    await user.click(screen.getByRole("button", { name: "Salvar plano" }));
    await waitFor(() =>
      expect(
        useAppStore.getState().records[0].medication?.schedules,
      ).toHaveLength(2),
    );
    await user.click(screen.getByRole("button", { name: "Encerrar plano" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Encerrar plano",
      }),
    );
    await screen.findByText("Plano encerrado");
    expect(useAppStore.getState().records[0].medication?.events).toHaveLength(
      2,
    );
    expect(
      screen.getByRole("button", { name: "Iniciar novo plano" }),
    ).toBeInTheDocument();
    const historicalDose = screen.getByText("00:00 · 0,5 mL").closest("li")!;
    expect(within(historicalDose).getByText("Não dada")).toBeInTheDocument();
  });
});
