import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecordForm } from "./record-form";
import { shiftDays, todayKey } from "@/lib/domain/dates";

describe("validação de registro de saúde", () => {
  beforeEach(() => sessionStorage.clear());

  it("recupera o rascunho após sair e mantém cada pet separado", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const first = render(
      <RecordForm
        petId="luna"
        petName="Luna"
        submitLabel="Salvar"
        onSubmit={onSubmit}
      />,
    );
    await user.type(
      screen.getByLabelText("Nome do cuidado"),
      "Consulta da Luna",
    );
    first.unmount();
    const other = render(
      <RecordForm
        petId="thor"
        petName="Thor"
        submitLabel="Salvar"
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByLabelText("Nome do cuidado")).toHaveValue("");
    other.unmount();
    render(
      <RecordForm
        petId="luna"
        petName="Luna"
        submitLabel="Salvar"
        onSubmit={onSubmit}
      />,
    );
    expect(
      await screen.findByDisplayValue("Consulta da Luna"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(
      sessionStorage.getItem("pethub:draft:v1:record:luna:vacina"),
    ).toBeNull();
  });
  it("recusa data vazia ou futura sem descartar campos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <RecordForm
        petId="pet-1"
        petName="Luna"
        submitLabel="Salvar"
        onSubmit={onSubmit}
      />,
    );
    await user.type(screen.getByLabelText("Nome do cuidado"), "Vacina da Luna");
    const date = screen.getByLabelText("Quando foi aplicada?");
    fireEvent.change(date, { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/data válida/);
    fireEvent.change(date, { target: { value: shiftDays(todayKey(), 1) } });
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome do cuidado")).toHaveValue(
      "Vacina da Luna",
    );
    fireEvent.change(date, { target: { value: todayKey() } });
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Vacina da Luna", date: todayKey() }),
    );
  });

  it("exige peso finito e válido para pesagem", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <RecordForm
        petId="pet-1"
        petName="Luna"
        initialType="peso"
        submitLabel="Salvar"
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Informe o peso/);
    const weight = screen.getByLabelText("Peso");
    for (const value of ["Infinity", "121", "-1"]) {
      fireEvent.change(weight, { target: { value } });
      await user.click(screen.getByRole("button", { name: "Salvar" }));
      expect(onSubmit).not.toHaveBeenCalled();
    }
    fireEvent.change(weight, { target: { value: "12,4" } });
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "peso", weightKg: 12.4 }),
    );
  });
});
