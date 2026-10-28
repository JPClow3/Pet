import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryExportPanel } from "./history-export-panel";
import { downloadText } from "@/lib/download";
import type { HealthRecord, Pet } from "@/lib/domain/schema";

vi.mock("@/lib/download", () => ({ downloadText: vi.fn() }));
const pet: Pet = {
  id: "luna",
  name: "Luna",
  species: "gato",
  breed: null,
  sex: "femea",
  birthDate: null,
  weightKg: null,
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
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const record: HealthRecord = {
  id: "one",
  petId: "luna",
  type: "vacina",
  title: "Vacina em janeiro",
  date: "2026-01-12",
  nextDueDate: null,
  leadDays: 0,
  recurrenceMonths: null,
  professional: null,
  notes: null,
  attachmentName: null,
  attachmentData: null,
  weightKg: null,
  completedAt: null,
  createdAt: "2026-01-12T00:00:00Z",
};

describe("seleção do histórico para exportação", () => {
  beforeEach(() => vi.clearAllMocks());
  it("mostra o total escolhido e baixa somente o período e pet selecionados", async () => {
    const user = userEvent.setup();
    render(
      <HistoryExportPanel
        pet={pet}
        records={[
          record,
          {
            ...record,
            id: "two",
            title: "Fora do período",
            date: "2026-02-01",
          },
          { ...record, id: "other", petId: "thor", title: "Outro pet" },
        ]}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Exportar histórico" }),
    );
    fireEvent.change(screen.getByLabelText("Data inicial"), {
      target: { value: "2026-01-01" },
    });
    fireEvent.change(screen.getByLabelText("Data final"), {
      target: { value: "2026-01-31" },
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 registro selecionado",
    );
    await user.click(
      screen.getByRole("button", { name: "Baixar resumo para imprimir" }),
    );
    const html = vi.mocked(downloadText).mock.calls[0][0];
    expect(html).toContain("Vacina em janeiro");
    expect(html).not.toContain("Fora do período");
    expect(html).not.toContain("Outro pet");
  });
  it("impede exportação vazia ou com intervalo invertido sem descartar a seleção", async () => {
    const user = userEvent.setup();
    render(<HistoryExportPanel pet={pet} records={[record]} />);
    await user.click(
      screen.getByRole("button", { name: "Exportar histórico" }),
    );
    fireEvent.change(screen.getByLabelText("Data inicial"), {
      target: { value: "2027-01-01" },
    });
    expect(
      screen.getByRole("button", { name: "Baixar resumo para imprimir" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Data final"), {
      target: { value: "2026-01-01" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("data final");
    expect(screen.getByLabelText("Data inicial")).toHaveValue("2027-01-01");
    expect(downloadText).not.toHaveBeenCalled();
  });
});
