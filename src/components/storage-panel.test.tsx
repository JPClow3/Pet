import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoragePanel } from "./storage-panel";

const originalStorage = Object.getOwnPropertyDescriptor(navigator, "storage");

function setStorage(value: unknown) {
  Object.defineProperty(navigator, "storage", { configurable: true, value });
}

afterEach(() => {
  if (originalStorage)
    Object.defineProperty(navigator, "storage", originalStorage);
  else Reflect.deleteProperty(navigator, "storage");
});

describe("espaço e proteção do armazenamento", () => {
  it("mostra a estimativa e só pede persistência após ação explícita", async () => {
    const user = userEvent.setup();
    const persist = vi.fn().mockResolvedValue(true);
    setStorage({
      estimate: vi
        .fn()
        .mockResolvedValue({ usage: 10 * 1024 ** 2, quota: 100 * 1024 ** 2 }),
      persisted: vi.fn().mockResolvedValue(false),
      persist,
    });
    render(<StoragePanel documentsHref="/pets/luna/documents" />);
    expect(
      await screen.findByText("10 MB usados de aproximadamente 100 MB"),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "10");
    expect(persist).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Ver documentos do pet" }),
    ).toHaveAttribute("href", "/pets/luna/documents");
    expect(
      screen.getByRole("link", { name: "Backup e recuperação" }),
    ).toHaveAttribute("href", "#local-backup");
    await user.click(
      screen.getByRole("button", { name: "Pedir armazenamento persistente" }),
    );
    expect(
      await screen.findByText(/Armazenamento persistente autorizado/),
    ).toHaveTextContent(/não.*substitui um backup/);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Pedir armazenamento persistente" }),
    ).not.toBeInTheDocument();
  });

  it("não apresenta recusa como perda dos dados nem como proteção concedida", async () => {
    const user = userEvent.setup();
    setStorage({
      estimate: vi.fn().mockResolvedValue({ usage: 0 }),
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(false),
    });
    render(<StoragePanel />);
    await user.click(
      await screen.findByRole("button", {
        name: "Pedir armazenamento persistente",
      }),
    );
    expect(
      await screen.findByText(/O navegador não autorizou/),
    ).toHaveTextContent("Seus dados continuam salvos");
    expect(
      screen.getByText("0 B usados · limite não informado"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pedir armazenamento persistente" }),
    ).toBeEnabled();
  });

  it("mantém acesso aos backups quando APIs não estão disponíveis", async () => {
    setStorage(undefined);
    render(<StoragePanel />);
    expect(
      await screen.findByText(/A estimativa de espaço não está disponível/),
    ).toBeInTheDocument();
    expect(screen.getByText(/não oferece a solicitação/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pedir armazenamento persistente" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Backup e recuperação" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /documento 10 MB, backup local 100 MB e cópia na nuvem 20 MB/,
      ),
    ).toBeInTheDocument();
  });

  it("permite recuperar uma consulta que falhou e não presume proteção após erro", async () => {
    const user = userEvent.setup();
    const estimate = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("Indisponível");
      })
      .mockResolvedValue({ usage: 1024, quota: 2048 });
    setStorage({
      estimate,
      persisted: vi.fn().mockRejectedValue(new Error("Bloqueado")),
      persist: vi.fn().mockRejectedValue(new Error("Bloqueado")),
    });
    render(<StoragePanel />);
    expect(
      await screen.findByText(/Não foi possível consultar o espaço/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Atualizar estimativa" }),
    );
    expect(
      await screen.findByText("1 KB usados de aproximadamente 2 KB"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Pedir armazenamento persistente" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Pedir armazenamento persistente" }),
      ).toBeEnabled(),
    );
    expect(
      screen.getByText(/Não foi possível verificar a proteção/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Armazenamento persistente autorizado/),
    ).not.toBeInTheDocument();
  });
});
