import { describe, expect, it } from "vitest";

import { petAge, petCompletion, petSize, lifeStage } from "./pet";
import type { Pet } from "./schema";

const NOW = new Date("2026-09-13T12:00:00.000Z");

describe("petAge", () => {
  it("descreve anos e meses", () => {
    expect(petAge("2024-06-13", NOW)?.label).toBe("2 anos e 3 meses");
    expect(petAge("2025-09-13", NOW)?.label).toBe("1 ano");
    expect(petAge("2026-05-13", NOW)?.label).toBe("4 meses");
    expect(petAge("2026-09-13", NOW)?.label).toBe("recém-chegado");
  });

  it("ignora data ausente ou futura", () => {
    expect(petAge(null, NOW)).toBeNull();
    expect(petAge("2027-01-01", NOW)).toBeNull();
  });
});

describe("petSize", () => {
  it("classifica cães por peso", () => {
    expect(petSize("cao", 4)).toBe("mini");
    expect(petSize("cao", 8)).toBe("pequeno");
    expect(petSize("cao", 18)).toBe("medio");
    expect(petSize("cao", 31.4)).toBe("grande");
    expect(petSize("cao", 50)).toBe("gigante");
  });

  it("usa faixas próprias para gatos", () => {
    expect(petSize("gato", 2.5)).toBe("pequeno");
    expect(petSize("gato", 4)).toBe("medio");
    expect(petSize("gato", 6.5)).toBe("grande");
  });

  it("sem peso não há classificação", () => {
    expect(petSize("cao", null)).toBeNull();
  });
});

describe("lifeStage", () => {
  it("identifica filhote, adulto e idoso", () => {
    expect(lifeStage("2026-02-13", NOW)).toBe("filhote");
    expect(lifeStage("2023-02-13", NOW)).toBe("adulto");
    expect(lifeStage("2018-02-13", NOW)).toBe("idoso");
  });
});

describe("petCompletion", () => {
  const base: Pet = {
    id: "pet-1",
    name: "Thor",
    species: "cao",
    breed: "Golden",
    sex: "macho",
    birthDate: "2022-03-10",
    weightKg: 31.4,
    photo: null,
    color: null,
    microchip: null,
    notes: null,
    routine: [],
    card: {
      shareBreed: true,
      shareCity: true,
      shareHealth: true,
      contact: null,
    },
    lostMode: { active: false, since: null, note: null },
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  };

  it("lista o que falta para completar a carteirinha", () => {
    const result = petCompletion(base);
    expect(result.total).toBe(6);
    expect(result.filled).toBe(3);
    expect(result.missing).toEqual([
      "foto",
      "microchip",
      "contato na carteirinha",
    ]);
  });

  it("reconhece o perfil completo", () => {
    const result = petCompletion({
      ...base,
      photo: "data:image/png;base64,abc",
      microchip: "982000000000000",
      card: { ...base.card, contact: "(11) 90000-0000" },
    });
    expect(result.missing).toHaveLength(0);
  });
});
