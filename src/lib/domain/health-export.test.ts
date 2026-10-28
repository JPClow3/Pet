import { describe, expect, it } from "vitest";
import { healthReportHtml, selectHealthExportRecords } from "./health-export";
import type { HealthRecord, Pet } from "./schema";
import { createMedicationCourse, recordMedicationDose } from "./medication";

const pet: Pet = {
  id: "luna",
  name: "Luna <3",
  species: "gato",
  breed: null,
  sex: "femea",
  birthDate: null,
  weightKg: null,
  photo: null,
  color: null,
  microchip: null,
  notes: null,
  routine: [],
  card: {
    shareBreed: false,
    shareCity: false,
    shareHealth: false,
    contact: "segredo",
  },
  lostMode: { active: false, since: null, note: null },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const record: HealthRecord = {
  id: "record",
  petId: "luna",
  type: "vacina",
  title: "Vacina",
  date: "2026-01-01",
  nextDueDate: null,
  leadDays: 0,
  recurrenceMonths: null,
  professional: null,
  notes: '<script>alert("test")</script>',
  attachmentData: "data:image/png;base64,AAAA",
  attachmentName: "carteirinha.png",
  weightKg: null,
  completedAt: null,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("exportação humana do histórico", () => {
  it("inclui o plano informado e todas as correções de doses sem executar conteúdo", () => {
    const now = new Date("2026-01-01T15:00:00Z");
    const course = createMedicationCourse(
      {
        amount: "1/2",
        unit: "comprimido",
        times: ["08:00"],
        everyDays: 1,
        startsOn: "2026-01-01",
        endsOn: null,
        timeZone: "America/Sao_Paulo",
        instructions: "<script>plano</script>",
        source: "Dra. Ana",
      },
      "plan",
      now,
    );
    const given = recordMedicationDose(
      course,
      {
        scheduleId: "plan",
        date: "2026-01-01",
        time: "08:00",
        status: "given",
        expectedEventId: null,
      },
      "first",
      now,
    );
    const corrected = recordMedicationDose(
      given,
      {
        scheduleId: "plan",
        date: "2026-01-01",
        time: "08:00",
        status: "missed",
        expectedEventId: "first",
        note: "Corrigido",
      },
      "second",
      now,
    );
    const html = healthReportHtml(
      pet,
      [{ ...record, type: "medicamento", medication: corrected }],
      now,
    );
    expect(html).toContain("1/2 comprimido");
    expect(html).toContain("Dra. Ana");
    expect(html).toContain("Dada");
    expect(html).toContain("Não dada");
    expect(html).toContain("Correção registrada");
    expect(html).toContain("&lt;script&gt;plano&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });
  it("isola o pet escolhido e não inclui contato nem dados brutos de imagens", () => {
    const html = healthReportHtml(pet, [
      record,
      { ...record, id: "other", petId: "other", title: "Privado de outro pet" },
    ]);
    expect(html).toContain("1 registro(s)");
    expect(html).not.toContain("Privado de outro pet");
    expect(html).not.toContain("segredo");
    expect(html).not.toContain("data:image");
    expect(html).toContain("carteirinha.png");
  });

  it("escapa conteúdo do tutor e produz um documento imprimível sem scripts", () => {
    const html = healthReportHtml(pet, [record]);
    expect(html).toContain("Luna &lt;3");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script");
    expect(html).toContain("@media print");
  });

  it("aplica datas inclusivas e tipos sem incluir outro pet", () => {
    const records = [
      record,
      { ...record, id: "end", date: "2026-02-01", title: "Fim do período" },
      { ...record, id: "old", date: "2025-12-31" },
      { ...record, id: "late", date: "2026-02-02" },
      { ...record, id: "weight", type: "peso" as const },
      { ...record, id: "other", petId: "other" },
    ];
    const filters = {
      fromDate: "2026-01-01",
      toDate: "2026-02-01",
      types: ["vacina" as const],
    };
    expect(
      selectHealthExportRecords(pet.id, records, filters).map(
        (item) => item.id,
      ),
    ).toEqual(["end", "record"]);
    const html = healthReportHtml(
      pet,
      records,
      new Date("2026-02-02T12:00:00Z"),
      filters,
    );
    expect(html).toContain("2 registro(s)");
    expect(html).toContain("01/01/2026 até 01/02/2026");
    expect(records.map((item) => item.id)).toEqual([
      "record",
      "end",
      "old",
      "late",
      "weight",
      "other",
    ]);
  });

  it("recusa filtros inválidos em vez de ampliar silenciosamente a exportação", () => {
    expect(() =>
      selectHealthExportRecords(pet.id, [record], { fromDate: "2026-02-30" }),
    ).toThrow();
    expect(() =>
      selectHealthExportRecords(pet.id, [record], {
        fromDate: "2026-02-01",
        toDate: "2026-01-01",
      }),
    ).toThrow();
    expect(() =>
      selectHealthExportRecords(pet.id, [record], { types: [] }),
    ).toThrow();
    expect(
      selectHealthExportRecords(pet.id, [record], { fromDate: "2027-01-01" }),
    ).toEqual([]);
  });
});
