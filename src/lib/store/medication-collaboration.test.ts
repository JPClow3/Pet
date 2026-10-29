import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/lib/store/app-store";
import { recordMedicationDose } from "@/lib/domain/medication";
import type { MedicationCourse } from "@/lib/domain/schema";
import { setCareSyncUser } from "@/lib/cloud/care-sync";

describe("Colaboração Multi-Tutor e Prevenção de Dose Dupla", () => {
  afterEach(() => {
    setCareSyncUser(null);
    vi.restoreAllMocks();
  });
  beforeEach(async () => {
    await useAppStore.setState({
      ready: true,
      tutor: {
        name: "Carlos",
        email: "carlos@example.com",
        city: "São Paulo",
        focusAreas: ["saude"],
        marketingOptIn: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      pets: [
        {
          id: "pet-luna",
          name: "Luna",
          species: "cao",
          breed: "Golden",
          sex: "femea",
          birthDate: "2022-01-01",
          weightKg: 28,
          photo: null,
          color: "Dourado",
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
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      records: [
        {
          id: "rec-antibiotico",
          petId: "pet-luna",
          type: "medicamento",
          title: "Amoxicilina 500mg",
          date: "2026-10-28",
          nextDueDate: null,
          leadDays: 0,
          recurrenceMonths: null,
          professional: "Dra. Julia",
          notes: "Dar de 12 em 12h",
          attachmentName: null,
          attachmentData: null,
          weightKg: null,
          completedAt: null,
          createdAt: "2026-10-28T08:00:00.000Z",
          medication: {
            activeScheduleId: "sched-1",
            schedules: [
              {
                id: "sched-1",
                amount: "1",
                unit: "comprimido",
                times: ["08:00", "20:00"],
                everyDays: 1,
                startsOn: "2026-10-20",
                endsOn: "2026-11-05",
                timeZone: "America/Sao_Paulo",
                instructions: "Junto com a ração",
                source: "Receita",
                effectiveFrom: null,
                closedAt: null,
                createdAt: "2026-10-28T08:00:00.000Z",
              },
            ],
            events: [],
          },
        },
      ],
    });
  });

  it.each(["given", "skipped"] as const)(
    "publica a dose diária %s e persiste a autoria vencedora de outro aparelho",
    async (status) => {
      setCareSyncUser("owner-user");
      const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json({
          event: {
            id: "shared-event",
            petId: "pet-luna",
            ownerUserId: "owner-user",
            actorUserId: "ana-user",
            actorName: "Ana",
            actorRole: "co_tutor",
            eventType: "medication_dose",
            recordId: "rec-antibiotico",
            scheduleId: "sched-1",
            eventKey: "sched-1:2026-10-28T08:00",
            status: "given",
            payload: { eventId: "dose-ana" },
            occurredAt: "2026-10-28T11:01:00.000Z",
            createdAt: "2026-10-28T11:01:00.000Z",
          },
        }),
      );
      const action = useAppStore
        .getState()
        .recordMedicationDose("rec-antibiotico", {
          scheduleId: "sched-1",
          date: "2026-10-28",
          time: "08:00",
          status,
          expectedEventId: null,
        });
      if (status === "given") expect(await action).toBe("dose-ana");
      else await expect(action).rejects.toThrow(/atualizada por Ana/);
      expect(fetch).toHaveBeenCalledWith(
        "/api/cloud/care-sync",
        expect.objectContaining({ method: "POST" }),
      );
      expect(
        useAppStore.getState().records[0].medication!.events.at(-1),
      ).toMatchObject({
        id: "dose-ana",
        recordedBy: "Ana",
        actorRole: "co_tutor",
      });
    },
  );

  it("registra quem administrou a dose no histórico para consulta da família", async () => {
    // Carlos (tutor logado) dá a dose das 08:00
    const eventId = await useAppStore
      .getState()
      .recordMedicationDose("rec-antibiotico", {
        scheduleId: "sched-1",
        date: "2026-10-28",
        time: "08:00",
        status: "given",
        expectedEventId: null,
      });

    const record = useAppStore
      .getState()
      .records.find((r) => r.id === "rec-antibiotico");
    const event = record?.medication?.events.find((e) => e.id === eventId);

    expect(event).toBeDefined();
    expect(event?.status).toBe("given");
    expect(event?.recordedBy).toBe("Carlos"); // Atribuído ao tutor ativo
    expect(event?.actorRole).toBe("tutor");
  });

  it("permite registrar dose administrada por co-tutor ou cuidador", async () => {
    // Ana (co-tutora) dá a dose das 08:00 do dia anterior
    const eventId = await useAppStore
      .getState()
      .recordMedicationDose("rec-antibiotico", {
        scheduleId: "sched-1",
        date: "2026-10-27",
        time: "08:00",
        status: "given",
        expectedEventId: null,
        recordedBy: "Ana (Co-tutora)",
        actorRole: "co_tutor",
      });

    const record = useAppStore
      .getState()
      .records.find((r) => r.id === "rec-antibiotico");
    const event = record?.medication?.events.find((e) => e.id === eventId);

    expect(event?.recordedBy).toBe("Ana (Co-tutora)");
    expect(event?.actorRole).toBe("co_tutor");
  });

  it("impede conflitos e alerta quando uma dose já foi dada em outro aparelho", () => {
    const course: MedicationCourse = {
      activeScheduleId: "sched-1",
      schedules: [
        {
          id: "sched-1",
          amount: "1",
          unit: "comprimido",
          times: ["08:00", "20:00"],
          everyDays: 1,
          startsOn: "2026-10-20",
          endsOn: "2026-11-05",
          timeZone: "America/Sao_Paulo",
          instructions: "Junto com a ração",
          source: "Receita",
          effectiveFrom: null,
          closedAt: null,
          createdAt: "2026-10-20T08:00:00.000Z",
        },
      ],
      events: [
        {
          id: "event-ana",
          scheduleId: "sched-1",
          date: "2026-10-25",
          time: "08:00",
          status: "given",
          recordedAt: "2026-10-25T11:05:00.000Z",
          note: null,
          correctsId: null,
          recordedBy: "Ana",
          actorRole: "co_tutor",
        },
      ],
    };

    // Se Carlos tentar dar a mesma dose com expectedEventId = null (achando que não foi dada):
    // Como a dose já está com status 'given', a função é idempotente e retorna o mesmo curso sem duplicar!
    const result = recordMedicationDose(
      course,
      {
        scheduleId: "sched-1",
        date: "2026-10-25",
        time: "08:00",
        status: "given",
        expectedEventId: null,
        recordedBy: "Carlos",
      },
      "new-event-carlos",
      new Date("2026-10-25T15:00:00.000Z"),
    );

    // O curso NÃO duplica eventos (mantém apenas a dose dada por Ana)
    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe("event-ana");
    expect(result.events[0].recordedBy).toBe("Ana");
  });
});
