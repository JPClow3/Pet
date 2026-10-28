import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentEditor } from "./document-editor";

describe("editor de documentos", () => {
  it("só fecha após persistir e mantém arquivo e campos quando o armazenamento falha", async () => {
    const user = userEvent.setup();
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("Sem espaço para guardar o documento."))
      .mockResolvedValueOnce(undefined);
    const close = vi.fn();
    render(<DocumentEditor petName="Luna" onClose={close} onSave={save} />);
    const file = new File(["%PDF-1.7\nfixture"], "exame.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText("Arquivo"), file);
    fireEvent.change(screen.getByLabelText("Data do documento"), {
      target: { value: "" },
    });
    await user.click(screen.getByRole("button", { name: "Guardar documento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem espaço");
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nome do documento")).toHaveValue("exame");
    expect(
      (screen.getByLabelText("Arquivo") as HTMLInputElement).files?.[0],
    ).toBe(file);
    await user.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: "exame",
        date: null,
        category: "exame",
      }),
      expect.objectContaining({
        fileName: "exame.pdf",
        blob: expect.any(Blob),
      }),
    );
  });
  it("bloqueia arquivo com conteúdo incompatível antes de alterar os dados", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(<DocumentEditor petName="Luna" onClose={vi.fn()} onSave={save} />);
    await user.upload(
      screen.getByLabelText("Arquivo"),
      new File(["<html>não é PDF</html>"], "receita.pdf", {
        type: "application/pdf",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Guardar documento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("válida");
    expect(save).not.toHaveBeenCalled();
  });
});
