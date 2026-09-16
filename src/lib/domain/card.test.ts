import { describe, expect, it } from "vitest";

import {
  buildPublicCard,
  decodePublicCard,
  encodePublicCard,
  publicCardPath,
} from "./card";
import type { HealthRecord, Pet } from "./schema";

const NOW = new Date("2026-09-13T12:00:00.000Z");

function pet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: "pet-1",
    name: "Thor",
    species: "cao",
    breed: "Golden Retriever",
    sex: "macho",
    birthDate: "2022-03-10",
    weightKg: 31.4,
    photo: null,
    color: "Dourado",
    microchip: null,
    notes: null,
    routine: ["passeio"],
    card: {
      shareBreed: true,
      shareCity: true,
      shareHealth: true,
      contact: "(11) 90000-0000",
    },
    lostMode: { active: false, since: null, note: null },
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

function record(overrides: Partial<HealthRecord> = {}): HealthRecord {
  return {
    id: "record-1",
    petId: "pet-1",
    type: "vacina",
    title: "Vacina V10",
    date: "2026-01-10",
    nextDueDate: "2026-09-20",
    leadDays: 30,
    recurrenceMonths: 12,
    professional: null,
    notes: "Reforço anual",
    attachmentName: null,
    attachmentData: null,
    weightKg: null,
    completedAt: null,
    createdAt: "2026-01-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("código do QR", () => {
  it("faz ida e volta preservando acentos", () => {
    const card = buildPublicCard({
      pet: pet({ name: "Fumaça" }),
      records: [],
      city: "São Paulo",
      now: NOW,
    });
    const decoded = decodePublicCard(encodePublicCard(card));
    expect(decoded).toEqual(card);
    expect(decoded?.name).toBe("Fumaça");
  });

  it("gera um código seguro para URL", () => {
    const code = encodePublicCard(
      buildPublicCard({ pet: pet(), records: [], city: "São Paulo", now: NOW }),
    );
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(
      publicCardPath(
        buildPublicCard({
          pet: pet(),
          records: [],
          city: "São Paulo",
          now: NOW,
        }),
      ),
    ).toBe(`/p/${code}`);
  });

  it("devolve null para código inválido", () => {
    expect(decodePublicCard("nao-e-json")).toBeNull();
  });
});

describe("privacidade da carteirinha", () => {
  it("esconde raça, cidade e saúde quando o tutor desliga", () => {
    const card = buildPublicCard({
      pet: pet({
        card: {
          shareBreed: false,
          shareCity: false,
          shareHealth: false,
          contact: null,
        },
      }),
      records: [record()],
      city: "São Paulo",
      now: NOW,
    });
    expect(card.breed).toBeNull();
    expect(card.city).toBeNull();
    expect(card.health).toBeNull();
    expect(card.name).toBe("Thor");
  });

  it("resume o próximo cuidado quando a saúde é compartilhada", () => {
    const card = buildPublicCard({
      pet: pet(),
      records: [record()],
      city: "São Paulo",
      now: NOW,
    });
    expect(card.health).toEqual({
      status: "atencao",
      nextDueDate: "2026-09-20",
    });
  });

  it("marca o modo perdido com data e observação", () => {
    const card = buildPublicCard({
      pet: pet({
        lostMode: { active: true, since: "2026-09-12", note: "Coleira azul" },
      }),
      records: [],
      city: "São Paulo",
      now: NOW,
    });
    expect(card.lost).toEqual({ since: "2026-09-12", note: "Coleira azul" });
  });
});
