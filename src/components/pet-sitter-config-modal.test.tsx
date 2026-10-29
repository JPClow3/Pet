import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PetSitterConfigModal } from "./pet-sitter-config-modal";
import type { Pet } from "@/lib/domain/schema";

const mockSitter = vi.hoisted(() => ({
  createPass: vi.fn(),
  updatePet: vi.fn(),
}));

vi.mock("@/lib/store/app-store", () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      updatePet: mockSitter.updatePet,
      tutor: { name: "Carlos" },
    }),
}));

vi.mock("@/lib/cloud/collaboration-client", () => ({
  createSitterPassCloud: mockSitter.createPass,
}));

vi.mock("@/lib/cloud/client", () => ({
  getCloudClient: () => ({
    useSession: () => ({
      data: { user: { id: "user-1", email: "carlos@example.com" } },
      isPending: false,
    }),
  }),
}));

const mockPet: Pet = {
  id: "pet-1",
  name: "Pipoca",
  species: "cao",
  breed: "SRD",
  sex: "macho",
  birthDate: "2023-01-01",
  weightKg: 10,
  photo: null,
  color: "Preto",
  microchip: null,
  notes: "Assusta com fogos",
  routine: [],
  allergies: ["Frango", "Glúten"],
  emergencyVet: {
    name: "Dr. André",
    phone: "11999990000",
    clinicName: "Vet 24 Horas",
    address: "Rua Augusta 500",
    is24h: true,
  },
  card: {
    shareBreed: true,
    shareCity: true,
    shareHealth: true,
    contact: "11988887777",
  },
  lostMode: { active: false, since: null, note: null },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Modal de Configuração do Modo Cuidador / Pet Sitter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSitter.updatePet.mockResolvedValue(undefined);
    mockSitter.createPass.mockResolvedValue({
      passId: "pass-1",
      token: "s_test_token_123456789012345678901234567890123",
      url: "/sitter/s_test_token_123456789012345678901234567890123",
      expiresAt: "2026-11-05T00:00:00.000Z",
    });
  });

  it("renderiza os campos essenciais: PIN, validade, alergias, rotina alimentar e emergência", () => {
    render(
      <PetSitterConfigModal
        pet={mockPet}
        records={[]}
        open={true}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Modo Cuidador / Pet Sitter" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/PIN de Proteção/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Tempo de Validade do Link/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Alergias alimentares ou medicamentosas/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Telefone do Tutor \(WhatsApp\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Telefone de Emergência Vet/i),
    ).toBeInTheDocument();
  });

  it("gera o link de cuidador e exibe QR Code e garantia de privacidade ao submeter", async () => {
    const user = userEvent.setup();
    render(
      <PetSitterConfigModal
        pet={mockPet}
        records={[]}
        open={true}
        onClose={vi.fn()}
      />,
    );

    const submitBtn = screen.getByRole("button", {
      name: "Gerar Acesso Seguro",
    });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Link do Cuidador Criado!" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Copiar Link do Cuidador/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Compartilhar no WhatsApp/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Garantia de Privacidade Zelupi/i),
      ).toBeInTheDocument();
    });
  });
});
