import { describe, expect, it } from "vitest";

import {
  getPetCardCopy,
  PET_CARD_FORMATS,
  petCardFileName,
} from "./pet-card-export";
import type { PublicPetCard } from "./domain/schema";

function publicCard(overrides: Partial<PublicPetCard> = {}): PublicPetCard {
  return {
    v: 1,
    name: "Fumaça & Sol",
    species: "cao",
    breed: "Vira-lata",
    city: "Rio Verde",
    lost: null,
    health: null,
    contact: null,
    ...overrides,
  };
}

describe("formatos da carteirinha exportável", () => {
  it("oferece carteira, post quadrado e story em alta resolução", () => {
    expect(PET_CARD_FORMATS).toMatchObject({
      wallet: { width: 1200, height: 760 },
      square: { width: 1080, height: 1080 },
      story: { width: 1080, height: 1920 },
    });
  });

  it("gera um nome de arquivo PNG seguro e identificável", () => {
    expect(petCardFileName("Fumaça & Sol", "story")).toBe(
      "carteirinha-fumaca-sol-story.png",
    );
    expect(petCardFileName("🐾", "wallet")).toBe("carteirinha-pet-wallet.png");
  });
});

describe("texto público usado no PNG", () => {
  it("omite raça, cidade, saúde e contato quando não foram liberados", () => {
    const copy = getPetCardCopy(
      publicCard({ breed: null, city: null, health: null, contact: null }),
    );

    expect(copy).toEqual({
      identity: "Cão",
      location: null,
      health: null,
      contact: null,
      lost: null,
    });
  });

  it("resume apenas os campos presentes no contrato público", () => {
    const copy = getPetCardCopy(
      publicCard({
        health: { status: "atencao", nextDueDate: "2026-09-20" },
        contact: "(64) 90000-0000",
        lost: { since: "2026-09-14", note: "Coleira azul" },
      }),
    );

    expect(copy.identity).toBe("Cão · Vira-lata");
    expect(copy.location).toBe("Rio Verde");
    expect(copy.health).toMatch(/Próximo cuidado chegando/);
    expect(copy.contact).toBe("(64) 90000-0000");
    expect(copy.lost).toMatch(/Estou perdido desde/);
  });
});
