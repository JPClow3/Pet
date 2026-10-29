import { describe, expect, it } from "vitest";
import {
  buildGoogleCalendarUrl,
  createBulkCalendarEvents,
  createCalendarEventFromRecord,
  createCalendarEventFromReminder,
  escapeIcsText,
  foldIcsLine,
  formatIcsAlarmTrigger,
  generateIcs,
  type CalendarEvent,
} from "./index";
import type { HealthRecord, Pet, Reminder } from "@/lib/domain/schema";
import type { ReminderItem } from "@/lib/domain/reminders";

describe("Calendar Module", () => {
  describe("escapeIcsText", () => {
    it("escapes backslashes, semicolons, commas and newlines", () => {
      const raw = "Dr. Silva; Clínica Pet, Bom Dia!\nSegunda linha\\teste";
      const escaped = escapeIcsText(raw);
      expect(escaped).toBe(
        "Dr. Silva\\; Clínica Pet\\, Bom Dia!\\nSegunda linha\\\\teste",
      );
    });
  });

  describe("foldIcsLine", () => {
    it("leaves lines shorter than limit unmodified", () => {
      const short = "SUMMARY:Vacina V10";
      expect(foldIcsLine(short)).toBe(short);
    });

    it("folds long lines with CRLF and leading space", () => {
      const long =
        "DESCRIPTION:" +
        "Esta é uma descrição muito longa para testar o folding de linhas do RFC 5545 para garantir que nenhum leitor de calendário quebre ao importar o arquivo.";
      const folded = foldIcsLine(long, 50);
      expect(folded).toContain("\r\n ");
      for (const line of folded.split("\r\n")) {
        expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(51);
      }
    });
  });

  describe("formatIcsAlarmTrigger", () => {
    it("formats day durations correctly", () => {
      expect(formatIcsAlarmTrigger(1440)).toBe("-P1D");
      expect(formatIcsAlarmTrigger(2880)).toBe("-P2D");
    });

    it("formats hour durations correctly", () => {
      expect(formatIcsAlarmTrigger(60)).toBe("-PT1H");
      expect(formatIcsAlarmTrigger(120)).toBe("-PT2H");
    });

    it("formats minute durations correctly", () => {
      expect(formatIcsAlarmTrigger(45)).toBe("-PT45M");
      expect(formatIcsAlarmTrigger(15)).toBe("-PT15M");
    });
  });

  describe("generateIcs", () => {
    const fixedNow = new Date("2026-10-28T12:00:00Z");

    it("generates valid RFC 5545 calendar for an all-day event", () => {
      const event: CalendarEvent = {
        id: "vacina-123",
        title: "Vacina: V10 (Pipoca)",
        description: "Dose anual da vacina V10.\nClínica Veterinária Central.",
        startDate: "2026-11-15",
        startTime: null,
        location: "Clínica Vet Central",
        petName: "Pipoca",
        category: "vacina",
        alarms: [{ minutesBefore: 1440, description: "Amanhã: Vacina V10" }],
      };

      const ics = generateIcs(event, "Zelupi", fixedNow);

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("PRODID:-//Zelupi//Cuidados Pet//PT");
      expect(ics).toContain("X-WR-CALNAME:Zelupi");
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("UID:vacina-123@zelupi.app");
      expect(ics).toContain("DTSTART;VALUE=DATE:20261115");
      expect(ics).toContain("DTEND;VALUE=DATE:20261116"); // exclusive end date
      expect(ics).toContain("SUMMARY:Vacina: V10 (Pipoca)");
      expect(ics).toContain("LOCATION:Clínica Vet Central");
      expect(ics).toContain("BEGIN:VALARM");
      expect(ics).toContain("TRIGGER:-P1D");
      expect(ics).toContain("DESCRIPTION:Amanhã: Vacina V10");
      expect(ics).toContain("END:VALARM");
      expect(ics).toContain("END:VEVENT");
      expect(ics).toContain("END:VCALENDAR");
      expect(ics.endsWith("\r\n")).toBe(true);
    });

    it("generates valid RFC 5545 calendar for a timed event", () => {
      const event: CalendarEvent = {
        id: "consulta-456",
        title: "Consulta: Retorno (Pipoca)",
        description: "Retorno pós-operatório",
        startDate: "2026-11-20",
        startTime: "14:30",
        endTime: "15:30",
        location: "Hospital Pet",
        petName: "Pipoca",
      };

      const ics = generateIcs(event, "Zelupi", fixedNow);

      expect(ics).toContain("DTSTART:20261120T143000");
      expect(ics).toContain("DTEND:20261120T153000");
      // Default alarms when not provided
      expect(ics).toContain("TRIGGER:-P1D");
      expect(ics).toContain("TRIGGER:-PT2H");
    });
  });

  describe("buildGoogleCalendarUrl", () => {
    it("generates valid Google Calendar URL for all-day event", () => {
      const event: CalendarEvent = {
        id: "vermifugo-789",
        title: "Vermífugo: Drontal (Pipoca)",
        description: "Administrar 1 comprimido",
        startDate: "2026-11-10",
        startTime: null,
        location: "Em casa",
      };

      const url = buildGoogleCalendarUrl(event);
      expect(url).toContain("https://calendar.google.com/calendar/render?action=TEMPLATE");
      expect(url).toContain("text=" + encodeURIComponent("Vermífugo: Drontal (Pipoca)"));
      expect(url).toContain("dates=20261110/20261111");
      expect(url).toContain("details=" + encodeURIComponent("Administrar 1 comprimido"));
      expect(url).toContain("location=" + encodeURIComponent("Em casa"));
    });

    it("generates valid Google Calendar URL for timed event", () => {
      const event: CalendarEvent = {
        id: "consulta-101",
        title: "Consulta: Dra. Julia (Pipoca)",
        description: "Check-up semestral",
        startDate: "2026-11-12",
        startTime: "10:00",
        endTime: "11:00",
      };

      const url = buildGoogleCalendarUrl(event);
      expect(url).toContain("dates=20261112T100000/20261112T110000");
    });
  });

  describe("createCalendarEventFromRecord", () => {
    const pet: Pick<Pet, "name"> = { name: "Pipoca" };

    it("creates calendar event for a vaccine with nextDueDate", () => {
      const record = {
        id: "rec-1",
        petId: "pet-1",
        type: "vacina",
        title: "Raiva (Antirrábica)",
        date: "2025-11-01",
        nextDueDate: "2026-11-01",
        leadDays: 15,
        recurrenceMonths: 12,
        professional: "Dr. Silva",
        clinic: "Vet Popular",
        dose: "1 dose",
        batchNumber: "L12345",
        notes: "Sem reações adversas",
        weightKg: 5.5,
        cost: "80,00",
        attachmentName: null,
        attachmentData: null,
        completedAt: null,
        createdAt: "2025-11-01T10:00:00Z",
      } as unknown as HealthRecord;

      const event = createCalendarEventFromRecord(record, pet);
      expect(event).not.toBeNull();
      expect(event?.startDate).toBe("2026-11-01");
      expect(event?.title).toContain("Vacina: Raiva (Antirrábica)");
      expect(event?.title).toContain("Pipoca");
      expect(event?.description).toContain("Vet Popular");
      expect(event?.description).toContain("Dr. Silva");
      expect(event?.description).toContain("Dose: 1 dose");
      expect(event?.description).toContain("Lote: L12345");
      expect(event?.location).toBe("Vet Popular");
      expect(event?.alarms?.length).toBe(2);
    });

    it("creates calendar event for a consultation", () => {
      const record = {
        id: "rec-2",
        petId: "pet-1",
        type: "consulta",
        title: "Consulta Dermatológica",
        date: "2026-11-15",
        nextDueDate: null,
        leadDays: 3,
        recurrenceMonths: 0,
        professional: "Dra. Roberta",
        clinic: "DermoVet",
        dose: null,
        batchNumber: null,
        notes: "Avaliar coceira na orelha",
        weightKg: null,
        cost: null,
        attachmentName: null,
        attachmentData: null,
        completedAt: null,
        createdAt: "2026-10-25T10:00:00Z",
      } as unknown as HealthRecord;

      const event = createCalendarEventFromRecord(record, pet);
      expect(event).not.toBeNull();
      expect(event?.startDate).toBe("2026-11-15");
      expect(event?.title).toContain("Consulta: Consulta Dermatológica");
      expect(event?.description).toContain("Dra. Roberta");
      expect(event?.location).toBe("DermoVet");
    });
  });

  describe("createCalendarEventFromReminder", () => {
    it("creates calendar event from ReminderItem", () => {
      const item: ReminderItem = {
        key: "registro:rec-3",
        source: "registro",
        id: "rec-3",
        petId: "pet-1",
        petName: "Pipoca",
        title: "Vermífugo Plus",
        dueDate: "2026-11-18",
        leadDays: 5,
        days: 21,
        urgency: "futuro",
        notes: "Dar junto com a ração",
        snoozedUntil: null,
        reason: "Recorrência trimestral",
      };

      const record = {
        id: "rec-3",
        petId: "pet-1",
        type: "vermifugo",
        title: "Vermífugo Plus",
        date: "2026-08-18",
        nextDueDate: "2026-11-18",
        leadDays: 5,
        recurrenceMonths: 3,
        professional: null,
        clinic: "VetCare",
        dose: "1/2 comprimido",
        batchNumber: null,
        notes: null,
        weightKg: null,
        cost: null,
        attachmentName: null,
        attachmentData: null,
        completedAt: null,
        createdAt: "2026-08-18T10:00:00Z",
      } as unknown as HealthRecord;

      const event = createCalendarEventFromReminder(item, { name: "Pipoca" }, record);
      expect(event.title).toContain("Vermífugo: Vermífugo Plus (Pipoca)");
      expect(event.startDate).toBe("2026-11-18");
      expect(event.location).toBe("VetCare");
    });
  });

  describe("createBulkCalendarEvents", () => {
    it("collects upcoming care events for bulk export", () => {
      const pets = [
        {
          id: "pet-1",
          name: "Pipoca",
          species: "cao",
          breed: "Poodle",
          sex: "macho",
          birthDate: "2020-01-01",
          notes: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ] as unknown as Pet[];

      const records = [
        {
          id: "rec-v",
          petId: "pet-1",
          type: "vacina",
          title: "Glábula V8",
          date: "2025-11-20",
          nextDueDate: "2026-11-20",
          leadDays: 15,
          recurrenceMonths: 12,
          professional: null,
          batchNumber: null,
          notes: null,
          weightKg: null,
          attachmentName: null,
          attachmentData: null,
          completedAt: null,
          createdAt: "2025-11-20T00:00:00Z",
        },
        {
          id: "rec-old",
          petId: "pet-1",
          type: "vacina",
          title: "Vacina Antiga",
          date: "2024-01-01",
          nextDueDate: "2025-01-01", // Past due date
          leadDays: 15,
          recurrenceMonths: 12,
          professional: null,
          batchNumber: null,
          notes: null,
          weightKg: null,
          attachmentName: null,
          attachmentData: null,
          completedAt: null,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ] as unknown as HealthRecord[];

      const reminders: Reminder[] = [
        {
          id: "rem-1",
          petId: "pet-1",
          title: "Banho e Tosa",
          kind: "rotina",
          dueDate: "2026-11-25",
          leadDays: 2,
          notes: "Tosa higiênica",
          done: false,
          createdAt: "2026-10-25T00:00:00Z",
        },
      ];

      const events = createBulkCalendarEvents({
        records,
        reminders,
        pets,
        referenceDate: "2026-10-28",
      });

      // Should include upcoming vacina and upcoming reminder, excluding past vacina
      expect(events.length).toBe(2);
      expect(events[0].startDate).toBe("2026-11-20");
      expect(events[1].startDate).toBe("2026-11-25");
    });
  });
});
