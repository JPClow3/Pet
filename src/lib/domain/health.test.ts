import { describe, expect, it } from "vitest";

import {
  healthStatus,
  urgencyFor,
  weightTrend,
  upcomingRecords,
} from "./health";
import type { HealthRecord } from "./schema";

const NOW = new Date("2026-09-13T12:00:00.000Z");

function record(overrides: Partial<HealthRecord>): HealthRecord {
  return {
    id: "record-1",
    petId: "pet-1",
    type: "vacina",
    title: "Vacina V10",
    date: "2026-01-10",
    nextDueDate: null,
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

describe("urgencyFor", () => {
  it("classifica vencido, hoje, próximo e futuro", () => {
    expect(urgencyFor("2026-09-01", 30, NOW).urgency).toBe("vencido");
    expect(urgencyFor("2026-09-13", 30, NOW).urgency).toBe("hoje");
    expect(urgencyFor("2026-09-20", 30, NOW).urgency).toBe("proximo");
    expect(urgencyFor("2026-12-20", 30, NOW).urgency).toBe("futuro");
  });

  it("respeita o aviso configurado por registro", () => {
    expect(urgencyFor("2026-09-20", 3, NOW).urgency).toBe("futuro");
    expect(urgencyFor("2026-09-20", 10, NOW).urgency).toBe("proximo");
  });
});

describe("healthStatus", () => {
  it("pede o primeiro registro quando não há histórico", () => {
    const status = healthStatus([], NOW);
    expect(status.state).toBe("vazio");
    expect(status.headline).toContain("Nenhum cuidado");
  });

  it("prioriza o cuidado vencido", () => {
    const status = healthStatus(
      [
        record({ id: "a", title: "Antipulgas", nextDueDate: "2026-09-01" }),
        record({ id: "b", title: "Vacina V10", nextDueDate: "2026-10-01" }),
      ],
      NOW,
    );
    expect(status.state).toBe("vencido");
    expect(status.headline).toBe("Antipulgas está vencido");
    expect(status.overdueCount).toBe(1);
  });

  it("resume vários vencidos", () => {
    const status = healthStatus(
      [
        record({ id: "a", title: "Antipulgas", nextDueDate: "2026-09-01" }),
        record({ id: "b", title: "Vermífugo", nextDueDate: "2026-09-05" }),
      ],
      NOW,
    );
    expect(status.headline).toBe("2 cuidados vencidos");
  });

  it("avisa quando o cuidado é hoje", () => {
    const status = healthStatus(
      [record({ title: "Vacina V10", nextDueDate: "2026-09-13" })],
      NOW,
    );
    expect(status.state).toBe("atencao");
    expect(status.headline).toBe("Vacina V10 é hoje");
  });

  it("mostra tranquilidade quando tudo está em dia", () => {
    const status = healthStatus(
      [record({ title: "Vacina V10", nextDueDate: "2027-01-10" })],
      NOW,
    );
    expect(status.state).toBe("em_dia");
    expect(status.detail).toContain("10/01/2027");
  });
});

describe("upcomingRecords", () => {
  it("ordena por data e limita o resultado", () => {
    const items = upcomingRecords(
      [
        record({ id: "a", title: "C", nextDueDate: "2026-11-01" }),
        record({ id: "b", title: "A", nextDueDate: "2026-09-20" }),
        record({ id: "c", title: "B", nextDueDate: "2026-10-01" }),
      ],
      NOW,
      2,
    );
    expect(items.map((item) => item.record.title)).toEqual(["A", "B"]);
  });

  it("ignora registros sem próxima data", () => {
    expect(upcomingRecords([record({ nextDueDate: null })], NOW)).toHaveLength(
      0,
    );
  });
});

describe("weightTrend", () => {
  it("usa o peso do perfil quando não há histórico", () => {
    expect(weightTrend([], 31.4)).toEqual({
      latest: 31.4,
      previous: null,
      deltaKg: 0,
      sinceLabel: null,
    });
  });

  it("calcula a variação entre as duas últimas pesagens", () => {
    const trend = weightTrend(
      [
        record({ id: "w1", type: "peso", date: "2026-07-01", weightKg: 31 }),
        record({ id: "w2", type: "peso", date: "2026-08-01", weightKg: 31.4 }),
      ],
      null,
    );
    expect(trend?.latest).toBe(31.4);
    expect(trend?.deltaKg).toBe(0.4);
    expect(trend?.sinceLabel).toContain("julho");
  });

  it("retorna nulo sem histórico nem peso no perfil", () => {
    expect(weightTrend([], null)).toBeNull();
  });
});
