import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FirstAidGuide } from "./first-aid-guide";
import { seedPlaces } from "@/lib/domain/seed";

describe("FirstAidGuide", () => {
  it("nunca oferece ligar para uma clínica fictícia do exemplo", () => {
    render(<FirstAidGuide places={seedPlaces} />);

    expect(
      screen.queryByRole("link", { name: /Ligar agora/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Salve sua clínica 24h de confiança"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Salvar clínica 24h/i }),
    ).toHaveAttribute("href", "/explore?cadastrar=1");
  });

  it("funciona offline para busca rápida e liga para a clínica 24h salva pelo tutor", async () => {
    const user = userEvent.setup();
    render(
      <FirstAidGuide
        places={[
          ...seedPlaces,
          {
            ...seedPlaces[0],
            id: "place-mine",
            name: "Hospital da Vila",
            category: "veterinario",
            attributes: ["emergencia_24h"],
            seeded: false,
            source: "local",
            favorite: true,
            phone: "(81) 3333-4444",
          },
        ]}
      />,
    );

    expect(screen.getByText(/100% Offline/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ligar agora/i }),
    ).toHaveAttribute("href", "tel:8133334444");

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
