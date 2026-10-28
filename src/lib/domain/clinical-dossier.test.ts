import { describe, expect, it } from "vitest";
import { buildClinicalDossier, clinicalDossierHtml } from "./clinical-dossier";
import type { HealthRecord, Pet } from "./schema";
import { createMedicationCourse } from "./medication";

const basePet: Pet = {
  id: "pet-1",
  name: "Thor",
  species: "cao",
  breed: "Golden Retriever",
  sex: "macho",
  birthDate: "2020-05-10",
  weightKg: 32.5,
  targetWeightKg: 31.0,
  weightBaseline: {
    weightKg: 30.0,
    date: "2024-01-01",
    updatedAt: "2024-01-01T10:00:00Z",
  },
  photo: null,
  color: "Dourado",
  microchip: "981098102345678",
  allergies: ["Dipirona", "Frango"],
  chronicConditions: ["Displasia coxofemoral leve"],
  notes: "Muito agitado no consultório veterinário.",
  routine: [],
  card: {
    shareBreed: true,
    shareCity: true,
    shareHealth: true,
    contact: "11999999999",
  },
  lostMode: { active: false, since: null, note: null },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("clinical dossier domain logic", () => {
  it("aggregates weight summary, history and delta correctly", () => {
    const records: HealthRecord[] = [
      {
        id: "rec-w1",
        petId: "pet-1",
        type: "peso",
        title: "Pesagem clínica",
        date: "2026-03-01",
        nextDueDate: null,
        leadDays: 0,
        recurrenceMonths: null,
        professional: "Dra. Paula",
        notes: null,
        attachmentName: null,
        attachmentData: null,
        weightKg: 31.8,
        completedAt: null,
        createdAt: "2026-03-01T10:00:00Z",
      },
      {
        id: "rec-w2",
        petId: "pet-1",
        type: "peso",
        title: "Pesagem recente",
        date: "2026-05-01",
        nextDueDate: null,
        leadDays: 0,
        recurrenceMonths: null,
        professional: "Dr. Marcos",
        notes: null,
        attachmentName: null,
        attachmentData: null,
        weightKg: 32.5,
        completedAt: null,
        createdAt: "2026-05-01T10:00:00Z",
      },
    ];

    const dossier = buildClinicalDossier({
      pet: basePet,
      records,
      now: new Date("2026-05-10T12:00:00Z"),
    });

    expect(dossier.weight.currentWeightKg).toBe(32.5);
    expect(dossier.weight.previousWeightKg).toBe(31.8);
    expect(dossier.weight.deltaKg).toBe(0.7);
    expect(dossier.weight.targetWeightKg).toBe(31.0);
    expect(dossier.weight.history.length).toBe(3); // 2 records + baseline
  });

  it("extracts allergies and chronic conditions", () => {
    const dossier = buildClinicalDossier({
      pet: basePet,
      records: [],
    });

    expect(dossier.allergies).toContain("Dipirona");
    expect(dossier.allergies).toContain("Frango");
    expect(dossier.chronicConditions).toContain("Displasia coxofemoral leve");
  });

  it("extracts active medications with doses and schedules", () => {
    const course = createMedicationCourse(
      {
        amount: "1",
        unit: "comprimido",
        times: ["08:00", "20:00"],
        everyDays: 1,
        startsOn: "2026-05-01",
        endsOn: "2026-05-20",
        timeZone: "America/Sao_Paulo",
        instructions: "Dar após a refeição",
        source: "Dr. Marcos",
      },
      "sched-1",
      new Date("2026-05-01T12:00:00Z"),
    );

    const medRecord: HealthRecord = {
      id: "rec-med1",
      petId: "pet-1",
      type: "medicamento",
      title: "Anti-inflamatório Carprofeno",
      date: "2026-05-01",
      nextDueDate: null,
      leadDays: 0,
      recurrenceMonths: null,
      professional: "Dr. Marcos",
      notes: "Uso por 20 dias",
      attachmentName: null,
      attachmentData: null,
      weightKg: null,
      medication: course,
      completedAt: null,
      createdAt: "2026-05-01T10:00:00Z",
    };

    const dossier = buildClinicalDossier({
      pet: basePet,
      records: [medRecord],
      now: new Date("2026-05-05T12:00:00Z"),
    });

    expect(dossier.activeMedications.length).toBe(1);
    expect(dossier.activeMedications[0].title).toBe("Anti-inflamatório Carprofeno");
    expect(dossier.activeMedications[0].amount).toBe("1");
    expect(dossier.activeMedications[0].unit).toBe("comprimido");
    expect(dossier.activeMedications[0].times).toEqual(["08:00", "20:00"]);
    expect(dossier.activeMedications[0].instructions).toBe("Dar após a refeição");
  });

  it("extracts vaccines with manufacturer, lot number and expiration status", () => {
    const vacRecord: HealthRecord = {
      id: "rec-vac1",
      petId: "pet-1",
      type: "vacina",
      title: "Vacina V10 Polivalente",
      date: "2025-06-01",
      nextDueDate: "2026-06-01",
      leadDays: 30,
      recurrenceMonths: 12,
      professional: "Dra. Renata",
      manufacturer: "Zoetis",
      batchNumber: "LOTE-9988",
      notes: "Aplicado sem reações adversas",
      attachmentName: null,
      attachmentData: null,
      weightKg: null,
      completedAt: null,
      createdAt: "2025-06-01T10:00:00Z",
    };

    const dossier = buildClinicalDossier({
      pet: basePet,
      records: [vacRecord],
      now: new Date("2026-05-15T12:00:00Z"),
    });

    expect(dossier.recentVaccines.length).toBe(1);
    expect(dossier.recentVaccines[0].title).toBe("Vacina V10 Polivalente");
    expect(dossier.recentVaccines[0].manufacturer).toBe("Zoetis");
    expect(dossier.recentVaccines[0].batchNumber).toBe("LOTE-9988");
    expect(dossier.recentVaccines[0].status).toBe("atencao"); // Due within 30 days
  });

  it("extracts exams with attachments and details", () => {
    const examRecord: HealthRecord = {
      id: "rec-ex1",
      petId: "pet-1",
      type: "exame",
      title: "Hemograma Completo e Bioquímico",
      date: "2026-04-10",
      nextDueDate: null,
      leadDays: 0,
      recurrenceMonths: null,
      professional: "Laboratório VetLab",
      notes: "Plaquetas normais, creatinina 1.1",
      attachmentName: "hemograma.pdf",
      attachmentData: "data:application/pdf;base64,JVBERi0x...",
      weightKg: null,
      completedAt: null,
      createdAt: "2026-04-10T10:00:00Z",
    };

    const dossier = buildClinicalDossier({
      pet: basePet,
      records: [examRecord],
      now: new Date("2026-05-15T12:00:00Z"),
    });

    expect(dossier.recentExams.length).toBe(1);
    expect(dossier.recentExams[0].title).toBe("Hemograma Completo e Bioquímico");
    expect(dossier.recentExams[0].fileName).toBe("hemograma.pdf");
    expect(dossier.recentExams[0].fileData).toBe("data:application/pdf;base64,JVBERi0x...");
  });

  it("renders a safe and complete HTML printable report", () => {
    const dossier = buildClinicalDossier({
      pet: basePet,
      records: [],
      now: new Date("2026-05-15T12:00:00Z"),
    });

    const html = clinicalDossierHtml(dossier);
    expect(html).toContain("Thor");
    expect(html).toContain("Dipirona");
    expect(html).toContain("Displasia coxofemoral leve");
    expect(html).toContain("981098102345678");
    expect(html).toContain("Dossiê Clínico");
  });
});
