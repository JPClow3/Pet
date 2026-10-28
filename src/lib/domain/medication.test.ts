import { describe, expect, it } from "vitest";
import {
  activeMedicationSchedule,
  createMedicationCourse,
  endMedicationCourse,
  isMedicationOccurrence,
  latestDoseEvent,
  medicationClock,
  medicationDayOccurrences,
  medication24HoursOccurrences,
  nextMedicationOccurrence,
  recordMedicationDose,
  reviseMedicationCourse,
} from "./medication";
import {
  healthRecordSchema,
  medicationCourseSchema,
  medicationPlanInputSchema,
  type MedicationPlanInput,
  type Pet,
} from "./schema";
import { buildReminders } from "./reminders";
import { healthStatus } from "./health";
import { deriveNotifications } from "./notifications";

const now = new Date("2026-10-25T15:00:00Z"); // Noon in São Paulo.
const plan: MedicationPlanInput = {
  amount: "1/2",
  unit: "comprimido",
  times: ["08:00", "20:00"],
  everyDays: 1,
  startsOn: "2026-10-24",
  endsOn: "2026-10-27",
  timeZone: "America/Sao_Paulo",
  instructions: "Conforme a receita entregue",
  source: "Dra. Ana",
};
const course = () => createMedicationCourse(plan, "plan-1", now);
const input = {
  scheduleId: "plan-1",
  date: "2026-10-25",
  time: "08:00",
  status: "given" as const,
  expectedEventId: null,
};

describe("planos e histórico de medicação", () => {
  it("exige quantidade e calendário explícitos, sem inferir dados", () => {
    expect(
      medicationPlanInputSchema.safeParse({ ...plan, amount: "0" }).success,
    ).toBe(false);
    expect(
      medicationPlanInputSchema.safeParse({ ...plan, amount: "1/0" }).success,
    ).toBe(false);
    expect(
      medicationPlanInputSchema.safeParse({ ...plan, amount: "0,5" }).success,
    ).toBe(true);
    expect(
      medicationPlanInputSchema.safeParse({
        ...plan,
        times: ["08:00", "08:00"],
      }).success,
    ).toBe(false);
    expect(
      medicationPlanInputSchema.safeParse({ ...plan, times: ["24:00"] })
        .success,
    ).toBe(false);
    expect(
      medicationPlanInputSchema.safeParse({ ...plan, startsOn: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(
      medicationPlanInputSchema.safeParse({ ...plan, endsOn: "2026-10-23" })
        .success,
    ).toBe(false);
    expect(
      medicationPlanInputSchema.safeParse({
        ...plan,
        source: "",
        timeZone: "imaginary/zone",
      }).success,
    ).toBe(false);
  });

  it("segue o fuso registrado mesmo com outro dia no aparelho", () => {
    const date = new Date("2026-10-25T01:00:00Z");
    expect(medicationClock(plan.timeZone, date).date).toBe("2026-10-24");
    expect(nextMedicationOccurrence(course(), date)).toMatchObject({
      date: "2026-10-24",
      time: "08:00",
    });
  });

  it("mantém dias de calendário e horários durante mudanças de horário de verão", () => {
    const dst = createMedicationCourse(
      {
        ...plan,
        startsOn: "2026-03-07",
        endsOn: "2026-03-11",
        timeZone: "America/New_York",
        everyDays: 2,
      },
      "dst",
      now,
    );
    expect(medicationDayOccurrences(dst, "2026-03-08")).toEqual([]);
    expect(
      medicationDayOccurrences(dst, "2026-03-09").map((dose) => dose.time),
    ).toEqual(["08:00", "20:00"]);
    expect(
      nextMedicationOccurrence(dst, new Date("2026-03-08T16:00:00Z")),
    ).toMatchObject({ date: "2026-03-09", time: "08:00" });
  });

  it("não duplica o horário repetido na volta do horário de verão", () => {
    const dst = createMedicationCourse(
      {
        ...plan,
        startsOn: "2026-11-01",
        endsOn: "2026-11-01",
        times: ["01:30"],
        timeZone: "America/New_York",
      },
      "dst",
      now,
    );
    const dose = {
      ...input,
      scheduleId: "dst",
      date: "2026-11-01",
      time: "01:30",
    };
    const recorded = recordMedicationDose(
      dst,
      dose,
      "first",
      new Date("2026-11-01T05:45:00Z"),
    );
    const again = recordMedicationDose(
      recorded,
      dose,
      "second",
      new Date("2026-11-01T06:45:00Z"),
    );
    expect(again.events).toHaveLength(1);
  });

  it("avança após cada resultado, sem marcar doses passadas automaticamente", () => {
    const first = recordMedicationDose(course(), input, "a", now);
    expect(nextMedicationOccurrence(first, now)).toMatchObject({
      time: "20:00",
      date: "2026-10-25",
    });
    const second = recordMedicationDose(
      first,
      { ...input, time: "20:00", status: "skipped" },
      "b",
      new Date("2026-10-26T00:00:00Z"),
    );
    expect(
      nextMedicationOccurrence(second, new Date("2026-10-26T00:00:00Z")),
    ).toMatchObject({ time: "08:00", date: "2026-10-26" });
    expect(
      medicationDayOccurrences(second, "2026-10-24").every(
        (dose) => dose.event === null,
      ),
    ).toBe(true);
  });

  it("não permite confirmar doses futuras ou fora do plano", () => {
    expect(() =>
      recordMedicationDose(
        course(),
        { ...input, time: "20:00" },
        "future",
        now,
      ),
    ).toThrow(/ainda não chegou/);
    expect(() =>
      recordMedicationDose(
        course(),
        { ...input, time: "10:00" },
        "unknown",
        now,
      ),
    ).toThrow(/não faz parte/);
    expect(() =>
      recordMedicationDose(
        course(),
        { ...input, date: "2026-10-23" },
        "early",
        now,
      ),
    ).toThrow(/não faz parte/);
  });

  it("evita duplicatas e preserva correções por ocorrência", () => {
    const first = recordMedicationDose(course(), input, "a", now);
    expect(recordMedicationDose(first, input, "duplicate", now)).toBe(first);
    expect(() =>
      recordMedicationDose(first, { ...input, status: "missed" }, "stale", now),
    ).toThrow(/outra tela/);
    const corrected = recordMedicationDose(
      first,
      {
        ...input,
        status: "missed",
        expectedEventId: "a",
        note: "Corrigi uma confirmação por engano",
      },
      "b",
      now,
    );
    expect(corrected.events).toHaveLength(2);
    expect(
      latestDoseEvent(corrected, "plan-1", input.date, input.time),
    ).toMatchObject({ id: "b", status: "missed", correctsId: "a" });
    const undone = recordMedicationDose(
      corrected,
      { ...input, status: "unrecorded", expectedEventId: "b" },
      "c",
      now,
    );
    expect(nextMedicationOccurrence(undone, now)?.time).toBe("08:00");
    expect(undone.events[0].status).toBe("given");
  });

  it("recusa históricos de backup com confirmações duplicadas ou correções ramificadas", () => {
    const recorded = recordMedicationDose(course(), input, "a", now);
    expect(
      medicationCourseSchema.safeParse({
        ...recorded,
        events: [...recorded.events, { ...recorded.events[0], id: "b" }],
      }).success,
    ).toBe(false);
    const corrected = recordMedicationDose(
      recorded,
      { ...input, status: "missed", expectedEventId: "a" },
      "b",
      now,
    );
    expect(
      medicationCourseSchema.safeParse({
        ...corrected,
        events: [...corrected.events, { ...corrected.events[1], id: "c" }],
      }).success,
    ).toBe(false);
  });

  it("edita o futuro e preserva plano e doses anteriores", () => {
    const first = recordMedicationDose(course(), input, "a", now);
    const revised = reviseMedicationCourse(
      first,
      { ...plan, amount: "1", times: ["08:00", "18:00"] },
      "plan-2",
      now,
    );
    expect(revised.schedules).toHaveLength(2);
    expect(revised.schedules[0].amount).toBe("1/2");
    expect(revised.events).toEqual(first.events);
    expect(
      medicationDayOccurrences(revised, "2026-10-25").map((dose) => dose.time),
    ).toEqual(["08:00", "18:00"]);
    expect(nextMedicationOccurrence(revised, now)).toMatchObject({
      time: "18:00",
      schedule: { amount: "1" },
    });
    expect(
      reviseMedicationCourse(
        revised,
        { ...plan, amount: "1", times: ["18:00", "08:00"] },
        "unused",
        now,
      ),
    ).toBe(revised);
  });

  it("não recria uma dose ao editar no minuto exato do horário", () => {
    const boundary = new Date("2026-10-25T11:00:00Z");
    const revised = reviseMedicationCourse(
      course(),
      { ...plan, amount: "1" },
      "new",
      boundary,
    );
    const atEight = medicationDayOccurrences(revised, "2026-10-25").filter(
      (dose) => dose.time === "08:00",
    );
    expect(atEight).toHaveLength(1);
    expect(atEight[0].schedule.id).toBe("plan-1");
  });

  it("encerra próximos horários, permite corrigir o passado e retomar com nova versão", () => {
    const ended = endMedicationCourse(course(), "plan-1", now);
    expect(nextMedicationOccurrence(ended, now)).toBeNull();
    expect(
      medicationDayOccurrences(ended, "2026-10-25").map((dose) => dose.time),
    ).toEqual(["08:00"]);
    expect(
      recordMedicationDose(ended, { ...input, status: "missed" }, "a", now)
        .events,
    ).toHaveLength(1);
    const resumed = reviseMedicationCourse(ended, plan, "restart", now);
    expect(activeMedicationSchedule(resumed)?.id).toBe("restart");
    expect(medicationDayOccurrences(resumed, "2026-10-25")).toHaveLength(2);
    expect(() => endMedicationCourse(resumed, "plan-1", now)).toThrow(
      /plano mudou/,
    );
  });

  it("termina no último dia e não inclui horários após o encerramento", () => {
    expect(
      nextMedicationOccurrence(course(), new Date("2026-10-28T12:00:00Z")),
    ).toBeNull();
    expect(
      isMedicationOccurrence(course().schedules[0], "2026-10-28", "08:00"),
    ).toBe(false);
  });
});

describe("medicação na agenda de cuidados", () => {
  const record = () =>
    healthRecordSchema.parse({
      id: "record",
      petId: "pet",
      type: "medicamento",
      title: "Medicamento da receita",
      date: "2026-10-24",
      nextDueDate: null,
      recurrenceMonths: null,
      leadDays: 0,
      notes: null,
      professional: null,
      weightKg: null,
      attachmentData: null,
      attachmentName: null,
      completedAt: null,
      createdAt: now.toISOString(),
      medication: course(),
    });
  const pets = [{ id: "pet", name: "Luna" }] as Pet[];
  it("mantém registros genéricos legados válidos", () => {
    const legacy = record();
    delete legacy.medication;
    expect(healthRecordSchema.parse(legacy).medication).toBeUndefined();
    expect(
      healthRecordSchema.safeParse({ ...record(), nextDueDate: "2026-10-26" })
        .success,
    ).toBe(false);
    expect(
      healthRecordSchema.safeParse({ ...record(), type: "vacina" }).success,
    ).toBe(false);
  });
  it("inclui o próximo horário exato, sem recorrência genérica, e projeta o status da saúde", () => {
    const records = [record()];
    const items = buildReminders({
      pets,
      records,
      reminders: [],
      snoozes: {},
      now,
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      source: "medicamento",
      medication: { amount: "1/2", time: "08:00", due: true },
    });
    expect(healthStatus(records, now).state).toBe("atencao");
    const ended = {
      ...record(),
      medication: endMedicationCourse(course(), "plan-1", now),
    };
    expect(
      buildReminders({
        pets,
        records: [ended],
        reminders: [],
        snoozes: {},
        now,
      }),
    ).toEqual([]);
  });
  it("cria apenas aviso local de horário sem confirmação e remove a dose resolvida", () => {
    const input = {
      pets,
      records: [record()],
      reminders: [],
      places: [],
      products: [],
      enabled: {
        prevencao: true,
        rotina: true,
        social: false,
        local: false,
        comercial: false,
      },
      now,
    };
    const notifications = deriveNotifications(input);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toMatch(/sem confirmação/);
    expect(notifications[0].href).toBe("/pets/pet/health/record");
    expect(
      deriveNotifications({
        ...input,
        records: [
          {
            ...record(),
            medication: recordMedicationDose(
              course(),
              {
                scheduleId: "plan-1",
                date: "2026-10-25",
                time: "08:00",
                status: "given",
                expectedEventId: null,
              },
              "given",
              now,
            ),
          },
        ],
      }),
    ).toEqual([]);
  });

  it("calcula ocorrências das próximas 24 horas agrupadas por horário", () => {
    const medCourse = course();
    // At noon on 2026-10-25: 08:00 is due/past, 20:00 is future today, 08:00 tomorrow is future within 24h
    const doses = medication24HoursOccurrences(medCourse, now);
    expect(doses.length).toBe(3);
    expect(doses[0].date).toBe("2026-10-25");
    expect(doses[0].time).toBe("08:00");
    expect(doses[0].due).toBe(true);
    expect(doses[0].future).toBe(false);

    expect(doses[1].date).toBe("2026-10-25");
    expect(doses[1].time).toBe("20:00");
    expect(doses[1].due).toBe(false);
    expect(doses[1].future).toBe(true);

    expect(doses[2].date).toBe("2026-10-26");
    expect(doses[2].time).toBe("08:00");
    expect(doses[2].due).toBe(false);
    expect(doses[2].future).toBe(true);
  });
});
