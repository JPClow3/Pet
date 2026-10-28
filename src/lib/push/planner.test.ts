import { describe, expect, it } from "vitest";
import {
  createMedicationCourse,
  endMedicationCourse,
  recordMedicationDose,
  reviseMedicationCourse,
} from "@/lib/domain/medication";
import type {
  HealthRecord,
  MedicationPlanInput,
  Reminder,
} from "@/lib/domain/schema";
import { buildPushAgenda } from "./planner";
import { defaultPushPreferences } from "./schema";

const now = new Date("2026-10-25T00:00:00Z");
const preferences = { ...defaultPushPreferences(), quietEnabled: false };
const plan: MedicationPlanInput = {
  amount: "0,5",
  unit: "mL",
  times: ["08:00", "20:00"],
  everyDays: 1,
  startsOn: "2026-10-25",
  endsOn: null,
  timeZone: "UTC",
  instructions: "Private instructions",
  source: "Private clinic",
};
function record(patch: Partial<HealthRecord> = {}): HealthRecord {
  return {
    id: "record-1",
    petId: "pet-1",
    type: "vacina",
    title: "Private medication name",
    date: "2026-10-25",
    nextDueDate: "2026-10-28",
    leadDays: 2,
    recurrenceMonths: null,
    professional: "Private doctor",
    notes: "Private notes",
    attachmentData: null,
    attachmentName: null,
    weightKg: null,
    completedAt: null,
    createdAt: now.toISOString(),
    ...patch,
  };
}
function medication(
  input: Partial<MedicationPlanInput> = {},
  patch: Partial<HealthRecord> = {},
) {
  return record({
    type: "medicamento",
    nextDueDate: null,
    leadDays: 0,
    medication: createMedicationCourse({ ...plan, ...input }, "plan-1", now),
    ...patch,
  });
}
function reminder(patch: Partial<Reminder> = {}): Reminder {
  return {
    id: "reminder-1",
    petId: "pet-1",
    title: "Private routine",
    kind: "rotina",
    dueDate: "2026-10-27",
    leadDays: 1,
    notes: null,
    done: false,
    createdAt: now.toISOString(),
    ...patch,
  };
}
function source(
  records: HealthRecord[] = [],
  reminders: Reminder[] = [],
  snoozes: Record<string, string> = {},
) {
  return { pets: [{ id: "pet-1" }], records, reminders, snoozes };
}

describe("planejamento de push por ocorrência", () => {
  it("agenda antecedência e data do cuidado, e apenas a data do lembrete manual", () => {
    const agenda = buildPushAgenda(
      source([record()], [reminder()]),
      preferences,
      now,
    );
    expect(agenda.generatedAt).toBe(now.toISOString());
    expect(agenda.validUntil).toBe("2026-11-01T00:00:00.000Z");
    expect(
      agenda.occurrences.map((item) => [item.kind, item.dueAt, item.expiresAt]),
    ).toEqual([
      ["prevention", "2026-10-26T09:00:00.000Z", "2026-10-26T15:00:00.000Z"],
      ["routine", "2026-10-27T09:00:00.000Z", "2026-10-27T15:00:00.000Z"],
      ["prevention", "2026-10-28T09:00:00.000Z", "2026-10-28T15:00:00.000Z"],
    ]);
  });
  it("respeita adiar sem duplicar antecedência e data que caem no mesmo dia", () => {
    const agenda = buildPushAgenda(
      source([record()], [reminder()], {
        "registro:record-1": "2026-10-29",
        "manual:reminder-1": "2026-10-30",
      }),
      preferences,
      now,
    );
    expect(agenda.occurrences.map((item) => item.dueAt)).toEqual([
      "2026-10-29T09:00:00.000Z",
      "2026-10-30T09:00:00.000Z",
    ]);
  });
  it("retém chaves entre publicações e mudanças no horário geral", () => {
    const input = source([record()], [reminder()]);
    const first = buildPushAgenda(input, preferences, now);
    const second = buildPushAgenda(
      input,
      { ...preferences, dailyTime: "10:00", timeZone: "America/Sao_Paulo" },
      new Date("2026-10-25T01:00:00Z"),
    );
    expect(second.occurrences.map((item) => item.key)).toEqual(
      first.occurrences.map((item) => item.key),
    );
    expect(second.occurrences[0].dueAt).toBe("2026-10-26T13:00:00.000Z");
  });
  it("enumera todos os horários do plano e não transmite nomes, doses ou notas", () => {
    const agenda = buildPushAgenda(source([medication()]), preferences, now);
    expect(agenda.occurrences).toHaveLength(14);
    expect(agenda.occurrences[0]).toMatchObject({
      kind: "routine",
      dueAt: "2026-10-25T08:00:00.000Z",
      expiresAt: "2026-10-25T08:30:00.000Z",
    });
    expect(agenda.occurrences.at(-1)?.dueAt).toBe("2026-10-31T20:00:00.000Z");
    const json = JSON.stringify(agenda);
    for (const privateValue of [
      "Private",
      "0,5",
      "mL",
      "title",
      "amount",
      "petId",
      "recordId",
    ])
      expect(json).not.toContain(privateValue);
  });
  it("exclui resultados dados/pulados/perdidos mas permite voltar a sem confirmação", () => {
    const atDose = new Date("2026-10-25T08:00:00Z");
    const input = {
      scheduleId: "plan-1",
      date: "2026-10-25",
      time: "08:00",
      status: "given" as const,
      expectedEventId: null,
    };
    const base = medication();
    for (const status of ["given", "skipped", "missed"] as const) {
      const course = recordMedicationDose(
        base.medication!,
        { ...input, status },
        "event",
        atDose,
      );
      expect(
        buildPushAgenda(
          source([{ ...base, medication: course }]),
          preferences,
          atDose,
        ).occurrences[0].dueAt,
      ).toBe("2026-10-25T20:00:00.000Z");
    }
    const given = recordMedicationDose(
      base.medication!,
      input,
      "event",
      atDose,
    );
    const undone = recordMedicationDose(
      given,
      { ...input, status: "unrecorded", expectedEventId: "event" },
      "correction",
      atDose,
    );
    expect(
      buildPushAgenda(
        source([{ ...base, medication: undone }]),
        preferences,
        atDose,
      ).occurrences[0].dueAt,
    ).toBe(atDose.toISOString());
  });
  it("honra intervalo em dias, fim inclusivo, edição e encerramento", () => {
    const base = medication({ everyDays: 2, endsOn: "2026-10-29" });
    expect(
      buildPushAgenda(source([base]), preferences, now).occurrences,
    ).toHaveLength(6);
    const edited = reviseMedicationCourse(
      base.medication!,
      { ...plan, times: ["08:00", "19:00"] },
      "plan-2",
      new Date("2026-10-25T12:00:00Z"),
    );
    const schedule = buildPushAgenda(
      source([{ ...base, medication: edited }]),
      preferences,
      now,
    );
    expect(schedule.occurrences[0].dueAt).toBe("2026-10-25T19:00:00.000Z");
    expect(
      schedule.occurrences.every((item) => item.key.includes("plan-2")),
    ).toBe(true);
    const ended = endMedicationCourse(
      edited,
      "plan-2",
      new Date("2026-10-25T13:00:00Z"),
    );
    expect(
      buildPushAgenda(
        source([{ ...base, medication: ended }]),
        preferences,
        now,
      ).occurrences,
    ).toEqual([]);
  });
  it("converte a lacuna de DST com compatible e não duplica o horário repetido", () => {
    const spring = medication({
      timeZone: "America/New_York",
      startsOn: "2026-03-08",
      endsOn: "2026-03-08",
      times: ["02:30"],
    });
    expect(
      buildPushAgenda(
        source([spring]),
        preferences,
        new Date("2026-03-08T00:00:00Z"),
      ).occurrences[0].dueAt,
    ).toBe("2026-03-08T07:30:00.000Z");
    const autumn = medication({
      timeZone: "America/New_York",
      startsOn: "2026-11-01",
      endsOn: "2026-11-01",
      times: ["01:30"],
    });
    const fall = buildPushAgenda(
      source([autumn]),
      preferences,
      new Date("2026-11-01T00:00:00Z"),
    );
    expect(fall.occurrences).toHaveLength(1);
    expect(fall.occurrences[0].dueAt).toBe("2026-11-01T05:30:00.000Z");
    expect(
      buildPushAgenda(
        source([autumn]),
        preferences,
        new Date("2026-11-01T06:00:00Z"),
      ).occurrences,
    ).toEqual([]);
  });
  it("usa fuso do plano para doses e fuso das preferências para silêncio", () => {
    const base = medication({
      timeZone: "America/New_York",
      times: ["03:00", "04:00", "19:00", "20:00"],
      endsOn: "2026-10-25",
    });
    const agenda = buildPushAgenda(
      source([base]),
      { ...defaultPushPreferences("America/Sao_Paulo") },
      now,
    );
    expect(
      agenda.occurrences.map((item) => [item.dueAt, item.suppressed]),
    ).toEqual([
      ["2026-10-25T07:00:00.000Z", true],
      ["2026-10-25T08:00:00.000Z", true],
      ["2026-10-25T23:00:00.000Z", false],
      ["2026-10-26T00:00:00.000Z", false],
    ]);
  });
  it("suprime horário silencioso sem reagendar; limites início inclusivo/fim exclusivo", () => {
    const input = source([
      medication({
        times: ["06:59", "07:00", "21:59", "22:00"],
        endsOn: "2026-10-25",
      }),
    ]);
    const agenda = buildPushAgenda(input, defaultPushPreferences(), now);
    expect(agenda.occurrences.map((item) => item.suppressed)).toEqual([
      true,
      false,
      false,
      true,
    ]);
    const unquiet = buildPushAgenda(input, preferences, now);
    expect(agenda.occurrences.map((item) => item.dueAt)).toEqual(
      unquiet.occurrences.map((item) => item.dueAt),
    );
    const daytime = buildPushAgenda(
      input,
      { ...defaultPushPreferences(), quietStart: "07:00", quietEnd: "22:00" },
      now,
    );
    expect(daytime.occurrences.map((item) => item.suppressed)).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
  it("preserva a janela original após o horário e limita expiração ao horizonte", () => {
    const input = source([medication({ times: ["00:00", "23:59"] })]);
    const agenda = buildPushAgenda(input, preferences, now);
    expect(agenda.occurrences[0].dueAt).toBe(now.toISOString());
    expect(agenda.occurrences.at(-1)?.expiresAt).toBe(agenda.validUntil);
    const later = buildPushAgenda(
      input,
      preferences,
      new Date("2026-10-25T00:00:00.001Z"),
    );
    expect(later.occurrences[0]).toEqual(agenda.occurrences[0]);
    const expired = buildPushAgenda(
      input,
      preferences,
      new Date("2026-10-25T00:30:00Z"),
    );
    expect(expired.occurrences[0].dueAt).toBe("2026-10-25T23:59:00.000Z");
  });
  it("republica depois da meia-noite sem cancelar dose recente ou estender sua validade", () => {
    const input = source([
      medication({ times: ["23:59"], endsOn: "2026-10-25" }),
    ]);
    const first = buildPushAgenda(
      input,
      preferences,
      new Date("2026-10-25T23:58:00Z"),
    );
    const second = buildPushAgenda(
      input,
      preferences,
      new Date("2026-10-26T00:05:00Z"),
    );
    expect(second.occurrences).toEqual(first.occurrences);
    expect(second.occurrences[0].expiresAt).toBe("2026-10-26T00:29:00.000Z");
    expect(
      buildPushAgenda(input, preferences, new Date("2026-10-26T00:29:00Z"))
        .occurrences,
    ).toEqual([]);
  });
  it("mantém aviso geral por seis horas da data original sem reiniciar sua validade", () => {
    const input = source([record({ nextDueDate: "2026-10-25", leadDays: 0 })]);
    const options = { ...preferences, dailyTime: "23:59" };
    const first = buildPushAgenda(
      input,
      options,
      new Date("2026-10-25T23:58:00Z"),
    );
    expect(
      buildPushAgenda(input, options, new Date("2026-10-26T05:58:59Z"))
        .occurrences,
    ).toEqual(first.occurrences);
    expect(first.occurrences[0].expiresAt).toBe("2026-10-26T05:59:00.000Z");
    expect(
      buildPushAgenda(input, options, new Date("2026-10-26T05:59:00Z"))
        .occurrences,
    ).toEqual([]);
  });
  it("respeita categorias, lembretes concluídos e pets removidos", () => {
    const input = source(
      [
        record(),
        medication({}, { id: "medication" }),
        record({ id: "orphan", petId: "missing" }),
      ],
      [
        reminder({ done: true }),
        reminder({ id: "orphan-routine", petId: "missing" }),
      ],
    );
    expect(
      buildPushAgenda(
        input,
        { ...preferences, prevention: false, routine: false },
        now,
      ).occurrences,
    ).toEqual([]);
    expect(
      buildPushAgenda(input, { ...preferences, routine: false }, now)
        .occurrences,
    ).toHaveLength(2);
    expect(
      buildPushAgenda(input, { ...preferences, prevention: false }, now)
        .occurrences,
    ).toHaveLength(14);
  });
  it("recusa agendas acima de 1.000 avisos em vez de truncar silenciosamente", () => {
    const times = Array.from(
      { length: 12 },
      (_, i) => `${String(i).padStart(2, "0")}:00`,
    );
    const records = Array.from({ length: 13 }, (_, i) =>
      medication({ times }, { id: `record-${i}` }),
    );
    expect(() => buildPushAgenda(source(records), preferences, now)).toThrow(
      /1.000/,
    );
  });
});
