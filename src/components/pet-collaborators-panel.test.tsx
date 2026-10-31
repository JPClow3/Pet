import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PetCollaboratorsPanel } from "./pet-collaborators-panel";
import type { Pet } from "@/lib/domain/schema";

const mockCollabs = vi.hoisted(() => ({
  list: [
    {
      id: "collab-1",
      petId: "pet-1",
      petName: "Luna",
      ownerUserId: "user-1",
      collaboratorEmail: "ana@example.com",
      collaboratorUserId: "user-2",
      collaboratorName: "Ana",
      role: "co_tutor" as const,
      inviteCode: "inv_12345678",
      status: "accepted" as const,
      createdAt: "2026-10-28T10:00:00.000Z",
      acceptedAt: "2026-10-28T10:30:00.000Z",
      updatedAt: "2026-10-28T10:30:00.000Z",
    },
  ],
  fetch: vi.fn(),
  invite: vi.fn(),
  accept: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/cloud/collaboration-client", () => ({
  fetchCollaborators: mockCollabs.fetch,
  inviteCollaborator: mockCollabs.invite,
  acceptInvite: mockCollabs.accept,
  removeCollaborator: mockCollabs.remove,
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
};

describe("Painel de Colaboradores e Multi-Tutor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollabs.fetch.mockResolvedValue(mockCollabs.list);
  });

  it("renderiza o painel com tutor principal e lista de co-tutores vinculados", async () => {
    render(<PetCollaboratorsPanel pet={mockPet} />);

    expect(screen.getByText("Cuidadores e família")).toBeInTheDocument();
    expect(
      screen.getByText(/vê os remédios dados, para ninguém repetir a dose/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Ana")).toBeInTheDocument();
      expect(screen.getByText("ana@example.com")).toBeInTheDocument();
      expect(screen.getByText("Conectado")).toBeInTheDocument();
      expect(screen.getByText("inv_12345678")).toBeInTheDocument();
    });
  });

  it("abre modal para convidar co-tutor ao clicar no botão", async () => {
    const user = userEvent.setup();
    render(<PetCollaboratorsPanel pet={mockPet} />);

    const inviteBtn = screen.getByRole("button", {
      name: /Convidar parceiro\(a\) \/ co-tutor/i,
    });
    await user.click(inviteBtn);

    expect(
      screen.getByRole("heading", { name: "Convidar cuidador ou familiar" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome da pessoa")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail da conta Zelupi")).toBeInTheDocument();
  });
});
