import { describe, expect, it } from "vitest";

import { recommendProducts } from "./products";
import { seedPlaces, seedProducts } from "./seed";
import type { Pet } from "./schema";

const NOW = new Date("2026-09-13T12:00:00.000Z");
const origin = { lat: -23.5614, lng: -46.6559 };

function pet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: "pet-1",
    name: "Thor",
    species: "cao",
    breed: "Golden Retriever",
    sex: "macho",
    birthDate: "2023-03-10",
    weightKg: 31.4,
    photo: null,
    color: null,
    microchip: null,
    notes: null,
    routine: ["passeio"],
    card: {
      shareBreed: true,
      shareCity: true,
      shareHealth: true,
      contact: null,
    },
    lostMode: { active: false, since: null, note: null },
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("recommendProducts", () => {
  it("explica por que cada produto apareceu", () => {
    const [first] = recommendProducts({
      pet: pet(),
      products: seedProducts,
      places: seedPlaces,
      origin,
      now: NOW,
    });
    expect(first.reasons.length).toBeGreaterThan(0);
    expect(first.reasons.join(" ")).toContain("porte grande");
    expect(first.reasons.join(" ")).toContain("pets adultos");
    expect(first.reasons.join(" ")).toContain("passeio");
  });

  it("coloca primeiro o que combina com porte, fase e rotina", () => {
    const results = recommendProducts({
      pet: pet(),
      products: seedProducts,
      places: seedPlaces,
      origin,
      now: NOW,
    });
    expect(results[0].product.id).toBe("product-peitoral");
  });

  it("respeita a espécie do pet", () => {
    const results = recommendProducts({
      pet: pet({ species: "gato" }),
      products: seedProducts,
      now: NOW,
    });
    expect(results.every((item) => item.product.species.includes("gato"))).toBe(
      true,
    );
    expect(results.some((item) => item.product.id === "product-peitoral")).toBe(
      false,
    );
  });

  it("usa a fase de vida para priorizar produtos sênior", () => {
    const results = recommendProducts({
      pet: pet({ birthDate: "2017-03-10" }),
      products: seedProducts,
      places: seedPlaces,
      origin,
      now: NOW,
    });
    const senior = results.find(
      (item) => item.product.id === "product-racao-idoso",
    );
    expect(senior?.reasons.join(" ")).toContain("pets idosos");
  });

  it("informa a distância do parceiro quando há localização", () => {
    const results = recommendProducts({
      pet: pet(),
      products: seedProducts,
      places: seedPlaces,
      origin,
      now: NOW,
    });
    const peitoral = results.find(
      (item) => item.product.id === "product-peitoral",
    );
    expect(peitoral?.reasons.join(" ")).toContain(
      "Disponível em Caminho Certo Passeios",
    );
    expect(peitoral?.partnerDistanceKm).toBeGreaterThan(0);
  });

  it("limita a quantidade quando pedido", () => {
    expect(
      recommendProducts({
        pet: pet(),
        products: seedProducts,
        limit: 3,
        now: NOW,
      }),
    ).toHaveLength(3);
  });

  it("sem sinais do pet ainda explica a recomendação", () => {
    const results = recommendProducts({
      pet: pet({ weightKg: null, birthDate: null, routine: [] }),
      products: seedProducts,
      now: NOW,
    });
    expect(results[0].reasons).toEqual(["Compatível com a espécie do seu pet"]);
  });
});
