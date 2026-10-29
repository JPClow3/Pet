import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SitterAccessPage from "@/app/sitter/[token]/page";
import type { SitterViewData } from "@/lib/domain/collaboration";

const mockClient = vi.hoisted(() => ({
  fetchPass: vi.fn(),
  verifyPin: vi.fn(),
  recordCare: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: mockClient.success, error: mockClient.error },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "s_sample_token_12345678901234567890123456789" }),
}));

vi.mock("@/lib/cloud/sitter-client", () => ({
  fetchSitterPass: mockClient.fetchPass,
  verifySitterPassPin: mockClient.verifyPin,
  recordSitterCareAction: mockClient.recordCare,
}));

const sampleUnlockedData: SitterViewData = {
  v: 1,
  generatedAt: "2026-10-28T12:00:00.000Z",
  pet: {
    id: "pet-1",
    name: "Pipoca",
    species: "cao",
    breed: "Beagle",
    birthDate: "2023-01-01",
    photo: null,
    color: "Tricolor",
  },
  allergies: ["Frango", "Picada de pulga"],
  specialCareNotes: "Passear somente na guia peitoral",
  emergencyContact: {
    tutorName: "Carlos",
    tutorPhone: "11988887777",
    emergencyVetName: "Hospital Veterinário 24h",
    emergencyVetPhone: "1133334444",
    emergencyClinicName: "VetCare Centro",
    emergencyAddress: "Av. Paulista 1000",
    is24h: true,
  },
  feedingSchedule: [
    {
      id: "feed-1",
      time: "08:00",
      description: "Ração Seca",
      amount: "120g",
    },
  ],
  medicationSchedule: [
    {
      recordId: "rec-1",
      scheduleId: "sched-1",
      name: "Antibiótico Cefalexina",
      amount: "1",
      unit: "comprimido",
      times: ["08:00", "20:00"],
      instructions: "Dar junto da comida",
      startsOn: "2026-10-28",
      endsOn: "2026-11-05",
      active: true,
    },
  ],
};

describe("Página do Modo Cuidador / Pet Sitter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe tela de bloqueio por PIN quando o acesso é protegido", async () => {
    mockClient.fetchPass.mockResolvedValue({
      petId: "pet-1",
      hasPin: true,
      sitterName: "Hotel Cão Feliz",
      expiresAt: "2026-11-05T00:00:00.000Z",
      data: null,
    });

    render(<SitterAccessPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Modo Cuidador Protegido" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Digite o PIN/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Desbloquear Cuidados" }),
      ).toBeInTheDocument();
    });
  });

  it("desbloqueia o painel com PIN correto e renderiza alergias, emergência e rotina", async () => {
    const user = userEvent.setup();
    mockClient.fetchPass.mockResolvedValue({
      petId: "pet-1",
      hasPin: true,
      sitterName: "Hotel Cão Feliz",
      expiresAt: "2026-11-05T00:00:00.000Z",
      data: null,
    });
    mockClient.verifyPin.mockResolvedValue(sampleUnlockedData);
    mockClient.recordCare.mockResolvedValue(true);

    render(<SitterAccessPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Digite o PIN/i)).toBeInTheDocument();
    });

    const pinInput = screen.getByLabelText(/Digite o PIN/i);
    await user.type(pinInput, "1234");
    await user.click(
      screen.getByRole("button", { name: "Desbloquear Cuidados" }),
    );

    await waitFor(() => {
      // Identificação
      expect(
        screen.getByRole("heading", { name: "Pipoca" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Modo Cuidador Ativo")).toBeInTheDocument();

      // Alergias críticas
      expect(
        screen.getByRole("heading", { name: "ATENÇÃO: Alergias e Restrições" }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Frango/i)).toBeInTheDocument();

      // Contatos de emergência
      expect(screen.getByText("Carlos")).toBeInTheDocument();
      expect(screen.getByText("Hospital Veterinário 24h")).toBeInTheDocument();

      // Rotina alimentar
      expect(screen.getByText("Ração Seca")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Servir" }),
      ).toBeInTheDocument();

      // Medicamento
      expect(screen.getByText("Antibiótico Cefalexina")).toBeInTheDocument();
      expect(
        screen.getAllByRole("button", { name: "Dar remédio" }),
      ).toHaveLength(2);
    });
    await user.click(screen.getAllByRole("button", { name: "Dar remédio" })[0]);
    await waitFor(() =>
      expect(mockClient.recordCare).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          pin: "1234",
          eventKey: expect.stringMatching(/^sched-1:\d{4}-\d{2}-\d{2}T08:00$/),
        }),
      ),
    );
    expect(screen.getAllByRole("button", { name: "Dar remédio" })).toHaveLength(
      1,
    );
  });

  it("mantém a ação disponível quando o servidor rejeita o cuidado", async () => {
    mockClient.fetchPass.mockResolvedValue({
      hasPin: false,
      data: sampleUnlockedData,
    });
    mockClient.recordCare.mockRejectedValueOnce(new Error("PIN expirado"));
    const user = userEvent.setup();
    render(<SitterAccessPage />);
    await user.click(await screen.findByRole("button", { name: "Servir" }));
    await waitFor(() =>
      expect(mockClient.error).toHaveBeenCalledWith("PIN expirado"),
    );
    expect(screen.getByRole("button", { name: "Servir" })).toBeInTheDocument();
    expect(mockClient.success).not.toHaveBeenCalled();
  });
});
