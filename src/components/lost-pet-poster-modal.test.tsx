import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LostPetPosterModal } from "./lost-pet-poster-modal";
import type { Pet } from "@/lib/domain/schema";

const mockPet: Pet = {
  id: "pet-toby",
  name: "Toby",
  species: "cao",
  breed: "Vira-lata (SRD)",
  sex: "macho",
  birthDate: "2022-01-01",
  weightKg: 10.0,
  photo: null,
  color: "Preto com manchas brancas",
  microchip: "981098102345678",
  allergies: [],
  chronicConditions: [],
  notes: "Muito assustado",
  routine: [],
  card: {
    shareBreed: true,
    shareCity: true,
    shareHealth: true,
    contact: "11 99999-0000",
  },
  lostMode: {
    active: true,
    since: "2026-05-01",
    note: "Sumiu perto do parque",
    neighborhood: "Vila Madalena",
    contactPhone: "11 99999-0000",
    reward: "R$ 500",
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("LostPetPosterModal component", () => {
  it("renders poster configuration options and download buttons", () => {
    render(
      <LostPetPosterModal
        pet={mockPet}
        publicUrl="https://zelupi.app/p/c_test"
        open={true}
        onClose={() => {}}
      />,
    );

    expect(
      screen.getByText("Gerador de Cartaz de Pet Perdido"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Vila Madalena")).toBeInTheDocument();
    expect(screen.getByDisplayValue("11 99999-0000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("R$ 500")).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Imprimir Cartaz A4 \/ Salvar como PDF/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Baixar Imagem A4 \(PNG\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Baixar para WhatsApp \(Feed\)/i }),
    ).toBeInTheDocument();
  });

  it("updates field values when user types in inputs", () => {
    render(
      <LostPetPosterModal
        pet={mockPet}
        publicUrl="https://zelupi.app/p/c_test"
        open={true}
        onClose={() => {}}
      />,
    );

    const neighborhoodInput = screen.getByLabelText(
      /Bairro onde desapareceu/i,
    );
    fireEvent.change(neighborhoodInput, { target: { value: "Moema" } });
    expect(screen.getByDisplayValue("Moema")).toBeInTheDocument();

    const rewardInput = screen.getByLabelText(/Recompensa/i);
    fireEvent.change(rewardInput, { target: { value: "R$ 1.500" } });
    expect(screen.getByDisplayValue("R$ 1.500")).toBeInTheDocument();
  });
});
