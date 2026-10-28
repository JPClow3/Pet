import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Chip } from "./chip";
import { BottomSheet } from "./sheet";

function SheetHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir painel de teste
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Novo local de confiança"
        description="Cadastre telefone e WhatsApp para emergência."
      >
        <label htmlFor="place-name-input">Nome do local</label>
        <input id="place-name-input" type="text" />
      </BottomSheet>
    </div>
  );
}

describe("Acessibilidade WCAG 2.2 AA (BottomSheet e Chip)", () => {
  it("anuncia abertura do BottomSheet para leitores de tela, move o foco e restaura ao fechar", async () => {
    const user = userEvent.setup();
    render(<SheetHarness />);

    const trigger = screen.getByRole("button", {
      name: /abrir painel de teste/i,
    });
    trigger.focus();
    expect(trigger).toHaveFocus();

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: /novo local de confiança/i,
    });
    expect(dialog).toBeInTheDocument();

    // Verifica anúncio em live region polite
    expect(
      screen.getByText(/painel aberto: novo local de confiança/i),
    ).toBeInTheDocument();

    // Fecha o sheet com Escape e verifica restauração de foco no botão acionador
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /novo local de confiança/i }),
      ).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("usa pares semânticos opacos de alto contraste nos chips de status", () => {
    render(
      <div>
        <Chip tone="warning">Hoje</Chip>
        <Chip tone="danger">Atrasado</Chip>
        <Chip tone="teal">Em dia</Chip>
      </div>,
    );

    const warningChip = screen.getByText("Hoje");
    const dangerChip = screen.getByText("Atrasado");
    const tealChip = screen.getByText("Em dia");

    expect(warningChip.className).toContain("bg-warning-soft");
    expect(warningChip.className).toContain("text-warning-ink");
    expect(dangerChip.className).toContain("bg-danger-soft");
    expect(dangerChip.className).toContain("text-danger-ink");
    expect(tealChip.className).toContain("bg-mint");
    expect(tealChip.className).toContain("text-teal-ink");
  });
});
