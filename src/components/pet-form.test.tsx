import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PetForm } from "@/components/pet-form";

describe("validação do perfil do pet", () => {
  beforeEach(() => sessionStorage.clear());
  it("aguarda o salvamento e preserva o rascunho quando a gravação falha", async () => {
    const user = userEvent.setup();
    let rejectSave!: (reason: Error) => void;
    const submit = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectSave = reject;
          }),
      )
      .mockResolvedValueOnce(undefined);
    render(<PetForm submitLabel="Guardar pet" onSubmit={submit} />);
    await user.type(screen.getByLabelText("Nome do pet"), "Luna");
    await user.click(screen.getByRole("button", { name: "Guardar pet" }));
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
    expect(screen.getByLabelText("Nome do pet")).toBeDisabled();
    expect(sessionStorage.getItem("pethub:draft:v1:pet:new:new")).toContain(
      "Luna",
    );
    await act(async () => rejectSave(new Error("Quota")));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "continuam preenchidos",
    );
    expect(submit).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Nome do pet")).toHaveValue("Luna");
    await user.click(screen.getByRole("button", { name: "Guardar pet" }));
    await waitFor(() =>
      expect(sessionStorage.getItem("pethub:draft:v1:pet:new:new")).toBeNull(),
    );
  });
  it.each(["Infinity", "121", "0", "-3"])(
    "rejeita peso inválido %s antes de salvar",
    async (weight) => {
      const user = userEvent.setup();
      const submit = vi.fn();
      render(<PetForm submitLabel="Guardar pet" onSubmit={submit} />);
      await user.type(screen.getByLabelText("Nome do pet"), "Luna");
      await user.click(screen.getByText("Adicionar mais detalhes"));
      await user.type(screen.getByLabelText("Peso"), weight);
      await user.click(screen.getByRole("button", { name: "Guardar pet" }));
      expect(screen.getByRole("alert")).toHaveTextContent("até 120 kg");
      expect(submit).not.toHaveBeenCalled();
    },
  );

  it("restaura texto sem guardar foto e remove rascunho após salvar", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    const view = render(
      <PetForm submitLabel="Guardar pet" onSubmit={submit} />,
    );
    await user.type(screen.getByLabelText("Nome do pet"), "Luna");
    view.unmount();
    render(<PetForm submitLabel="Guardar pet" onSubmit={submit} />);
    expect(await screen.findByText(/Rascunho recuperado/)).toBeInTheDocument();
    expect(screen.getByLabelText("Nome do pet")).toHaveValue("Luna");
    expect(sessionStorage.getItem("pethub:draft:v1:pet:new:new")).not.toContain(
      "photo",
    );
    await user.click(screen.getByRole("button", { name: "Guardar pet" }));
    expect(submit).toHaveBeenCalled();
    expect(sessionStorage.getItem("pethub:draft:v1:pet:new:new")).toBeNull();
  });
});
