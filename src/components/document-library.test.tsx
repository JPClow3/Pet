import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentLibrary } from "./document-library";
import type { PetDocument } from "@/lib/domain/document";
import type { Pet } from "@/lib/domain/schema";

const actions = vi.hoisted(() => ({
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  trashDocument: vi.fn(),
  restoreDocument: vi.fn(),
  readMedia: vi.fn(),
}));
vi.mock("@/lib/store/app-store", () => ({
  useAppStore: { getState: () => actions },
}));
vi.mock("@/lib/store/media", () => ({ readMedia: actions.readMedia }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));
const pet: Pet = {
  id: "luna",
  name: "Luna",
  species: "gato",
  breed: null,
  sex: "femea",
  birthDate: null,
  weightKg: null,
  photo: null,
  color: null,
  microchip: null,
  notes: null,
  routine: [],
  card: {
    shareBreed: false,
    shareCity: false,
    shareHealth: false,
    contact: null,
  },
  lostMode: { active: false, since: null, note: null },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const item: PetDocument = {
  id: "doc",
  petId: "luna",
  title: "Exame de outubro",
  category: "exame",
  date: "2026-10-25",
  notes: null,
  mediaId: "blob",
  mimeType: "application/pdf",
  fileName: "exame.pdf",
  sizeBytes: 12,
  createdAt: "2026-10-25T12:00:00Z",
  updatedAt: "2026-10-25T12:00:00Z",
  deletedAt: null,
};

describe("biblioteca de documentos", () => {
  beforeEach(() => vi.resetAllMocks());
  it("separa a lixeira e oferece recuperação sem apagar o arquivo", async () => {
    const user = userEvent.setup();
    render(
      <DocumentLibrary
        pet={pet}
        documents={[
          item,
          {
            ...item,
            id: "trashed",
            title: "Receita antiga",
            category: "receita",
            deletedAt: "2026-10-25T13:00:00Z",
          },
        ]}
        records={[]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Exame de outubro" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Receita antiga" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lixeira (1)" }));
    await user.click(
      screen.getByRole("button", { name: "Restaurar Receita antiga" }),
    );
    expect(actions.restoreDocument).toHaveBeenCalledWith("trashed");
    expect(actions.trashDocument).not.toHaveBeenCalled();
  });
  it("mantém o documento acessível quando mover à lixeira falha", async () => {
    actions.trashDocument.mockRejectedValueOnce(
      new Error("Armazenamento indisponível."),
    );
    const user = userEvent.setup();
    render(<DocumentLibrary pet={pet} documents={[item]} records={[]} />);
    await user.click(
      screen.getByRole("button", {
        name: "Mover Exame de outubro para a lixeira",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Armazenamento indisponível",
    );
    expect(
      screen.getByRole("button", { name: "Baixar Exame de outubro" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("heading", { name: "Exame de outubro" }),
    ).toBeInTheDocument();
  });
  it("oferece recuperação quando o arquivo não pode ser lido", async () => {
    actions.readMedia.mockRejectedValueOnce(
      new Error("Arquivo ausente. Restaure um backup."),
    );
    const user = userEvent.setup();
    render(<DocumentLibrary pet={pet} documents={[item]} records={[]} />);
    await user.click(
      screen.getByRole("button", { name: "Baixar Exame de outubro" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Restaure um backup",
    );
    expect(
      screen.getByRole("heading", { name: "Exame de outubro" }),
    ).toBeInTheDocument();
  });
});
