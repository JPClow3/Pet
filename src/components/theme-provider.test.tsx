import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider, ThemeToggle } from "@/components/theme-provider";

describe("ThemeProvider", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    localStorage.clear();
  });

  it("mantém o conteúdo sob a configuração global de movimento", () => {
    render(
      <ThemeProvider>
        <p>Conteúdo</p>
      </ThemeProvider>,
    );

    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });

  it("alterna e persiste a escolha explícita do tutor", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggle = screen.getByRole("button", { name: "Ativar tema escuro" });
    await user.click(toggle);

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).not.toHaveClass("light");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Ativar tema claro" }),
    ).toBeInTheDocument();
  });
});
