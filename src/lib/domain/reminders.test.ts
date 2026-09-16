import { describe, expect, it } from "vitest";

import {
  buildReminders,
  isSnoozed,
  reminderSummary,
  snoozeUntil,
} from "./reminders";
import type { HealthRecord, Pet, Reminder } from "./schema";

const NOW = new Date("2026-09-13T12:00:00.000Z");

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
    nextDueDate: "2026-09-20",
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

function manual(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: "reminder-1",
    petId: "pet-1",
    title: "Comprar ração",
    kind: "outro",
    dueDate: "2026-09-15",
    leadDays: 3,
    notes: null,
    done: false,
    createdAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildReminders", () => {
  it("combina registros de saúde e lembretes manuais", () => {
    const items = buildReminders({
      pets: [pet],
      records: [record()],
      reminders: [manual()],
      snoozes: {},
      now: NOW,
    });
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.source).sort()).toEqual([
      "manual",
      "registro",
    ]);
  });

  it("ordena por urgência e depois por data", () => {
    const items = buildReminders({
      pets: [pet],
      records: [
        record({ id: "r1", title: "Futuro", nextDueDate: "2026-12-01" }),
        record({ id: "r2", title: "Vencido", nextDueDate: "2026-09-01" }),
      ],
      reminders: [manual({ dueDate: "2026-09-13" })],
      snoozes: {},
      now: NOW,
    });
    expect(items.map((item) => item.urgency)).toEqual([
      "vencido",
      "hoje",
      "futuro",
    ]);
  });

  it("ignora registros sem próxima data e lembretes concluídos", () => {
    const items = buildReminders({
      pets: [pet],
      records: [record({ nextDueDate: null })],
      reminders: [manual({ done: true })],
      snoozes: {},
      now: NOW,
    });
    expect(items).toHaveLength(0);
  });

  it("ignora registros de pets removidos", () => {
    const items = buildReminders({
      pets: [],
      records: [record()],
      reminders: [manual()],
      snoozes: {},
      now: NOW,
    });
    expect(items).toHaveLength(0);
  });

  it("leva o adiamento para o item", () => {
    const [item] = buildReminders({
      pets: [pet],
      records: [record()],
      reminders: [],
      snoozes: { "registro:record-1": "2026-09-25" },
      now: NOW,
    });
    expect(item.snoozedUntil).toBe("2026-09-25");
    expect(isSnoozed(item, NOW)).toBe(true);
  });
});

describe("reminderSummary", () => {
  it("conta vencidos, de hoje e próximos", () => {
    const items = buildReminders({
      pets: [pet],
      records: [
        record({ id: "r1", nextDueDate: "2026-09-01" }),
        record({ id: "r2", nextDueDate: "2026-09-13" }),
        record({ id: "r3", nextDueDate: "2026-09-25" }),
      ],
      reminders: [],
      snoozes: {},
      now: NOW,
    });
    expect(reminderSummary(items)).toEqual({ overdue: 1, today: 1, soon: 1 });
  });
});

describe("snoozeUntil", () => {
  it("calcula a data de retorno", () => {
    expect(snoozeUntil(3, NOW)).toBe("2026-09-16");
    expect(snoozeUntil(7, NOW)).toBe("2026-09-20");
  });
});
