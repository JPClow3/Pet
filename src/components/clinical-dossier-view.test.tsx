import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClinicalDossierView } from "./clinical-dossier-view";
import type { HealthRecord, Pet } from "@/lib/domain/schema";

const mockPet: Pet = {
  id: "pet-bob",
  name: "Bob",
  species: "cao",
  breed: "Beagle",
  sex: "macho",
  birthDate: "2021-02-14",
  weightKg: 14.2,
  targetWeightKg: 13.5,
  photo: null,
  color: "Tricolor",
  microchip: "981098102345678",
  allergies: ["Dipirona", "Picada de pulga"],
  chronicConditions: ["Otite crônica"],
  notes: "Sensível no ouvido direito.",
  routine: [],
  card: {
    shareBreed: true,
    shareCity: true,
    shareHealth: true,
    contact: "11999998888",
  },
  lostMode: { active: false, since: null, note: null },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockRecords: HealthRecord[] = [
  {
    id: "rec-v1",
    petId: "pet-bob",
    type: "vacina",
    title: "Vacina Antirrábica Nobivac",
    date: "2025-04-10",
    nextDueDate: "2026-04-10",
    leadDays: 30,
    recurrenceMonths: 12,
    professional: "Dr. André",
    manufacturer: "MSD Saúde Animal",
    batchNumber: "A9876",
    notes: "Sem reações",
    attachmentName: null,
    attachmentData: null,
    weightKg: 14.0,
    completedAt: null,
    createdAt: "2025-04-10T10:00:00Z",
  },
  {
    id: "rec-m1",
    petId: "pet-bob",
    type: "medicamento",
    title: "Otomax Pomada Otológica",
    date: "2026-05-01",
    nextDueDate: null,
    leadDays: 0,
    recurrenceMonths: null,
    professional: "Dra. Carol",
    notes: "Aplicar 4 gotas a cada 12h no ouvido direito por 10 dias",
    attachmentName: null,
    attachmentData: null,
    weightKg: 14.2,
    completedAt: null,
    createdAt: "2026-05-01T10:00:00Z",
  },
  {
    id: "rec-e1",
    petId: "pet-bob",
    type: "exame",
    title: "Citologia de Ouvido",
    date: "2026-05-01",
    nextDueDate: null,
    leadDays: 0,
    recurrenceMonths: null,
    professional: "Laboratório VetPat",
    notes: "Presença moderada de Malassezia",
    attachmentName: "laudo-citologia.jpg",
    attachmentData: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    weightKg: null,
    completedAt: null,
    createdAt: "2026-05-01T10:00:00Z",
  },
];

describe("ClinicalDossierView component", () => {
  it("renders clinical dossier with all 5 core sections", () => {
    render(<ClinicalDossierView pet={mockPet} records={mockRecords} />);

    // Header and Identification
    expect(screen.getByText("Modo Consulta Veterinária")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Beagle")).toBeInTheDocument();

    // Section 1: Weight and history
    expect(screen.getByText("Peso Atual e Histórico")).toBeInTheDocument();
    expect(screen.getAllByText(/14,2 kg/)[0]).toBeInTheDocument();

    // Section 2: Allergies & Chronic Conditions
    expect(screen.getByText(/Alergias e Condições Crônicas/i)).toBeInTheDocument();
    expect(screen.getByText(/Dipirona/i)).toBeInTheDocument();
    expect(screen.getByText(/Otite crônica/i)).toBeInTheDocument();

    // Section 3: Active Medications
    expect(screen.getByText("Medicamentos em Uso")).toBeInTheDocument();
    expect(screen.getByText("Otomax Pomada Otológica")).toBeInTheDocument();

    // Section 4: Vaccines with manufacturer and batch
    expect(
      screen.getByText("Últimas Vacinas (Fabricante e Lote)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Vacina Antirrábica Nobivac")).toBeInTheDocument();
    expect(screen.getByText(/MSD Saúde Animal/i)).toBeInTheDocument();
    expect(screen.getByText(/Lote: A9876/i)).toBeInTheDocument();

    // Section 5: Recent Exams and attachments
    expect(
      screen.getByText("Acesso Rápido aos Exames e Anexos"),
    ).toBeInTheDocument();
    expect(screen.getByText("Citologia de Ouvido")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Visualizar anexo/i }),
    ).toBeInTheDocument();
  });

  it("opens attachment modal when clicking 'Visualizar anexo'", () => {
    render(<ClinicalDossierView pet={mockPet} records={mockRecords} />);

    const viewButton = screen.getByRole("button", {
      name: /Visualizar anexo/i,
    });
    fireEvent.click(viewButton);

    // Modal opens
    expect(
      screen.getByRole("button", { name: /Fechar visualização/i }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Citologia de Ouvido")).toBeInTheDocument();
  });
});
