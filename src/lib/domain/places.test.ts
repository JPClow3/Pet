import { describe, expect, it, vi } from "vitest";

import { placeCategorySchema } from "./schema";
import {
  buildOverpassQuery,
  criterionScores,
  distanceKm,
  emptyFilters,
  fetchNearbyOsmPlaces,
  filterPlaces,
  isEmergency24hPlace,
  parseOverpassResponse,
  phoneCallUrl,
  placeRating,
  whatsappUrl,
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
    expect(categories.size).toBe(placeCategorySchema.options.length);
  });

  it("mantém identificadores únicos", () => {
    const ids = seedPlaces.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("não marca lugar nenhum como visitado por padrão", () => {
    expect(place({ seeded: true }).seeded).toBe(true);
  });

  it("filtra clínicas 24h e favoritos de confiança priorizando emergência", () => {
    const customPlaces: Place[] = [
      ...seedPlaces,
      place({
        id: "place-fav-vet",
        name: "Hospital 24h de Confiança",
        category: "veterinario",
        attributes: ["emergencia_24h"],
        favorite: true,
        seeded: false,
        lat: -23.58,
        lng: -46.68,
      }),
    ];
    const emergency = filterPlaces(
      customPlaces,
      { ...emptyFilters, emergencyOnly: true },
      origin,
    );
    expect(emergency.length).toBeGreaterThanOrEqual(3);
    expect(emergency.every((item) => isEmergency24hPlace(item))).toBe(true);
    expect(emergency[0].id).toBe("place-fav-vet");

    const favorites = filterPlaces(
      customPlaces,
      { ...emptyFilters, favoritesOnly: true },
      origin,
    );
    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe("place-fav-vet");
  });

  it("formata links diretos de ligação e WhatsApp com segurança", () => {
    expect(phoneCallUrl("(11) 3062-0100")).toBe("tel:1130620100");
    expect(phoneCallUrl("+55 11 99000-0100")).toBe("tel:+5511990000100");
    expect(phoneCallUrl("12")).toBeNull();

    expect(whatsappUrl("(11) 99000-0100")).toBe("https://wa.me/5511990000100");
    expect(whatsappUrl("5511990000100", "Emergência veterinária")).toContain(
      "https://wa.me/5511990000100?text=Emerg%C3%AAncia",
    );
    expect(whatsappUrl("123")).toBeNull();
  });

  it("constrói consulta Overpass e converte nós OpenStreetMap em locais", async () => {
    const query = buildOverpassQuery(origin, 4000);
    expect(query).toContain('["amenity"="veterinary"]');
    expect(query).toContain("around:4000");

    const payload = {
      elements: [
        {
          type: "node",
          id: 901,
          lat: -23.56,
          lon: -46.66,
          tags: {
            name: "Hospital Veterinário 24h Paulista",
            amenity: "veterinary",
            opening_hours: "24/7",
            "contact:phone": "+55 11 3222-1111",
            "contact:whatsapp": "11988887777",
            "addr:street": "Avenida Paulista",
            "addr:housenumber": "1000",
            "addr:suburb": "Bela Vista",
          },
        },
        {
          type: "way",
          id: 902,
          center: { lat: -23.565, lon: -46.67 },
          tags: {
            name: "Farmácia Vet Manipulação",
            amenity: "pharmacy",
            veterinary: "yes",
          },
        },
      ],
    };

    const parsed = parseOverpassResponse(payload, "São Paulo");
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      id: "osm-node-901",
      name: "Hospital Veterinário 24h Paulista",
      category: "veterinario",
      attributes: ["emergencia_24h"],
      source: "osm",
      phone: "+55 11 3222-1111",
      whatsapp: "11988887777",
    });
    expect(parsed[1].category).toBe("farmacia");

    const fetchMock = vi.fn().mockResolvedValue(Response.json(payload));
    const fetched = await fetchNearbyOsmPlaces({
      origin,
      city: "São Paulo",
      fetchImpl: fetchMock,
    });
    expect(fetched).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
