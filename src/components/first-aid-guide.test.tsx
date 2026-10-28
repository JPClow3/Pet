import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FirstAidGuide } from "./first-aid-guide";
import { seedPlaces } from "@/lib/domain/seed";

describe("FirstAidGuide", () => {
  it("funciona offline para busca rápida de alimentos e exibe contatos de emergência 24h", async () => {
    const user = userEvent.setup();
    render(<FirstAidGuide places={seedPlaces} />);

    expect(screen.getByText(/100% Offline/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ligar agora/i }),
    ).toHaveAttribute("href", "tel:1130620100");

    const searchInput = screen.getByRole("searchbox", {
      name: /Buscar alimento, substância ou emergência/i,
    });
    await user.type(searchInput, "xilitol");

    expect(
      screen.getByRole("heading", { name: /Xilitol/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/hipoglicemia severa/i)).toBeInTheDocument();
  });

  it("permite acionar pílulas rápidas de pânico como Uva e Engasgo", async () => {
    const user = userEvent.setup();
    render(<FirstAidGuide places={seedPlaces} />);

    await user.click(screen.getByRole("button", { name: "Engasgo" }));
    expect(
      screen.getByRole("heading", { name: /Engasgo e asfixia aguda/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/O que NUNCA fazer/i)).toBeInTheDocument();
  });
});
