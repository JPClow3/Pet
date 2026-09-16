import { describe, expect, it } from "vitest";

import {
  deriveNotifications,
  mergeNotifications,
  unreadCount,
} from "./notifications";
import { seedPlaces, seedProducts } from "./seed";
import type { HealthRecord, Pet } from "./schema";

const NOW = new Date("2026-09-13T12:00:00.000Z");

const enabled = {
  prevencao: true,
  rotina: true,
  social: true,
  local: true,
  comercial: false,
};

const pet: Pet = {
  id: "pet-1",
  name: "Thor",
  species: "cao",
  breed: null,
  sex: "macho",
  birthDate: null,
  weightKg: null,
  photo: null,
  color: null,
  microchip: null,
  notes: null,
  routine: [],
  card: { shareBreed: true, shareCity: true, shareHealth: true, contact: null },
  lostMode: { active: false, since: null, note: null },
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
};

function record(overrides: Partial<HealthRecord> = {}): HealthRecord {
  return {
    id: "record-1",
    petId: "pet-1",
    type: "vacina",
    title: "Vacina V10",
    date: "2026-01-10",
    nextDueDate: "2026-09-27",
    leadDays: 30,
    recurrenceMonths: 12,
    professional: null,
    notes: null,
    attachmentName: null,
    attachmentData: null,
    weightKg: null,
    completedAt: null,
    createdAt: "2026-01-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("deriveNotifications", () => {
  it("cria aviso de prevenção com prazo", () => {
    const [notification] = deriveNotifications({
      pets: [pet],
      records: [record()],
      reminders: [],
      places: [],
      products: [],
      enabled,
      now: NOW,
    });
    expect(notification.kind).toBe("prevencao");
    expect(notification.body).toContain("vence em 14 dias");
  });

  it("não avisa sobre cuidados distantes", () => {
    const result = deriveNotifications({
      pets: [pet],
      records: [record({ nextDueDate: "2027-05-01" })],
      reminders: [],
      places: [],
      products: [],
      enabled,
      now: NOW,
    });
    expect(result).toHaveLength(0);
  });

  it("lembra a medicação do dia", () => {
    const result = deriveNotifications({
      pets: [pet],
      records: [
        record({
          id: "med-1",
          type: "medicamento",
          title: "Antibiótico",
          nextDueDate: "2026-09-13",
        }),
      ],
      reminders: [],
      places: [],
      products: [],
      enabled,
      now: NOW,
    });
    expect(result.some((item) => item.kind === "rotina")).toBe(true);
  });

  it("respeita preferências desligadas", () => {
    const result = deriveNotifications({
      pets: [pet],
      records: [record()],
      reminders: [],
      places: seedPlaces,
      products: seedProducts,
      enabled: { ...enabled, prevencao: false, local: false },
      now: NOW,
    });
    expect(result).toHaveLength(0);
  });

  it("mantém conteúdo comercial desligado por padrão e identificado quando ligado", () => {
    const off = deriveNotifications({
      pets: [pet],
      records: [],
      reminders: [],
      places: [],
      products: seedProducts,
      enabled,
      now: NOW,
    });
    expect(off).toHaveLength(0);

    const on = deriveNotifications({
      pets: [pet],
      records: [],
      reminders: [],
      places: [],
      products: seedProducts,
      enabled: { ...enabled, comercial: true },
      now: NOW,
    });
    expect(on[0].kind).toBe("comercial");
    expect(on[0].body).toContain("Conteúdo comercial");
  });
});

describe("mergeNotifications", () => {
  it("não duplica o mesmo aviso", () => {
    const incoming = deriveNotifications({
      pets: [pet],
      records: [record()],
      reminders: [],
      places: [],
      products: [],
      enabled,
      now: NOW,
    });
    const once = mergeNotifications([], incoming);
    const twice = mergeNotifications(once, incoming);
    expect(twice).toHaveLength(1);
  });

  it("acrescenta avisos novos na frente", () => {
    const incoming = deriveNotifications({
      pets: [pet],
      records: [record()],
      reminders: [],
      places: [],
      products: [],
      enabled,
      now: NOW,
    });
    const merged = mergeNotifications(
      [],
      [
        ...incoming,
        {
          ...incoming[0],
          id: "notif-antiga",
          createdAt: "2026-09-01T10:00:00.000Z",
        },
      ],
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe(incoming[0].id);
  });
});

describe("unreadCount", () => {
  it("conta apenas não lidas e não dispensadas", () => {
    expect(
      unreadCount([
        {
          id: "a",
          kind: "prevencao",
          title: "t",
          body: "b",
          href: null,
          createdAt: NOW.toISOString(),
          readAt: null,
          dismissed: false,
        },
        {
          id: "b",
          kind: "prevencao",
          title: "t",
          body: "b",
          href: null,
          createdAt: NOW.toISOString(),
          readAt: NOW.toISOString(),
          dismissed: false,
        },
        {
          id: "c",
          kind: "prevencao",
          title: "t",
          body: "b",
          href: null,
          createdAt: NOW.toISOString(),
          readAt: null,
          dismissed: true,
        },
      ]),
    ).toBe(1);
  });
});
