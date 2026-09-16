import { describe, expect, it } from "vitest";

import {
  criterionScores,
  distanceKm,
  emptyFilters,
  filterPlaces,
  placeRating,
} from "./places";
import { seedPlaces } from "./seed";
import type { Place, Review } from "./schema";

const origin = { lat: -23.5614, lng: -46.6559 };

function place(overrides: Partial<Place>): Place {
  return { ...seedPlaces[0], ...overrides };
}

function review(overrides: Partial<Review>): Review {
  return {
    id: "review-1",
    placeId: "place-figueiras",
    authorName: "Ana",
    criteria: ["area_cercada"],
    rating: 5,
    text: null,
    createdAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("distanceKm", () => {
  it("calcula a distância entre dois pontos", () => {
    expect(distanceKm(origin, origin)).toBe(0);
    const distance = distanceKm(
      { lat: -23.5614, lng: -46.6559 },
      { lat: -23.6021, lng: -46.7104 },
    );
    expect(distance).toBeGreaterThan(7);
    expect(distance).toBeLessThan(8.5);
  });
});

describe("filterPlaces", () => {
  it("ordena por proximidade", () => {
    const result = filterPlaces(seedPlaces, emptyFilters, origin);
    expect(result[0].distanceKm).toBeLessThanOrEqual(result[1].distanceKm);
  });

  it("filtra por categoria", () => {
    const result = filterPlaces(
      seedPlaces,
      { ...emptyFilters, categories: ["veterinario"] },
      origin,
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.category === "veterinario")).toBe(true);
  });

  it("filtra exigindo todos os atributos escolhidos", () => {
    const result = filterPlaces(
      seedPlaces,
      { ...emptyFilters, attributes: ["area_cercada", "agua_disponivel"] },
      origin,
    );
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (item) =>
          item.attributes.includes("area_cercada") &&
          item.attributes.includes("agua_disponivel"),
      ),
    ).toBe(true);
  });

  it("busca por nome e bairro", () => {
    expect(
      filterPlaces(seedPlaces, { ...emptyFilters, query: "aurora" }, origin),
    ).toHaveLength(1);
    expect(
      filterPlaces(
        seedPlaces,
        { ...emptyFilters, query: "vila madalena" },
        origin,
      ).length,
    ).toBeGreaterThan(1);
  });

  it("filtra apenas verificados", () => {
    const result = filterPlaces(
      seedPlaces,
      { ...emptyFilters, verifiedOnly: true },
      origin,
    );
    expect(result.every((item) => item.verified)).toBe(true);
  });

  it("exclui locais fora dos atributos pedidos", () => {
    expect(
      filterPlaces(
        seedPlaces,
        { ...emptyFilters, attributes: ["emergencia_24h", "sombra"] },
        origin,
      ),
    ).toHaveLength(0);
  });
});

describe("criterionScores", () => {
  it("conta critérios estruturados das avaliações", () => {
    const scores = criterionScores([
      review({ id: "a", criteria: ["area_cercada", "sombra"] }),
      review({ id: "b", criteria: ["area_cercada"] }),
    ]);
    const cercada = scores.find((score) => score.attribute === "area_cercada");
    expect(cercada).toEqual({
      attribute: "area_cercada",
      positive: 2,
      total: 2,
      positiveRatio: 1,
    });
  });

  it("sem avaliações não há pontuação", () => {
    expect(criterionScores([])).toEqual([]);
  });
});

describe("placeRating", () => {
  it("calcula a média", () => {
    expect(
      placeRating([
        review({ id: "a", rating: 5 }),
        review({ id: "b", rating: 4 }),
      ]),
    ).toEqual({ average: 4.5, total: 2 });
  });

  it("sem avaliações a média é zero", () => {
    expect(placeRating([])).toEqual({ average: 0, total: 0 });
  });
});

describe("seed", () => {
  it("cobre todas as categorias do mapa", () => {
    const categories = new Set(seedPlaces.map((item) => item.category));
    expect(categories.size).toBe(6);
  });

  it("mantém identificadores únicos", () => {
    const ids = seedPlaces.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("não marca lugar nenhum como visitado por padrão", () => {
    expect(place({ seeded: true }).seeded).toBe(true);
  });
});
