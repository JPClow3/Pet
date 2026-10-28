import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManagedCardPanel } from "./managed-card-panel";
import type { PublicPetCard } from "@/lib/domain/schema";
const mock = vi.hoisted(() => ({
  user: { id: "user-a", emailVerified: true } as {
    id: string;
    emailVerified: boolean;
  } | null,
  load: vi.fn(),
  change: vi.fn(),
}));
vi.mock("@/lib/cloud/client", () => ({
  getCloudClient: () => ({
    useSession: () => ({
      data: mock.user ? { user: mock.user } : null,
      isPending: false,
    }),
  }),
}));
vi.mock("@/lib/cloud/cards", async () => ({
  ...(await vi.importActual<typeof import("@/lib/cloud/cards")>(
    "@/lib/cloud/cards",
  )),
  loadManagedCard: mock.load,
  changeManagedCard: mock.change,
}));
const card: PublicPetCard = {
  v: 1,
  name: "Luna",
  species: "gato",
  breed: null,
  city: null,
  lost: null,
  health: null,
  contact: null,
};
const token = `c_${"A".repeat(43)}`;
const record = {
  id: "2ed9062f-808b-4c43-b03f-d368d7c5300d",
  petId: "pet-a",
  revision: 1,
  tokenVersion: "155ecaf9-342e-4f0e-84a8-473b5e891e62",
  card,
  expiresAt: "2099-01-01T12:00:00Z",
  updatedAt: "2026-10-25T12:00:00Z",
  revokedAt: null,
};
describe("publicação gerenciada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mock.user = { id: "user-a", emailVerified: true };
    mock.load.mockResolvedValue(null);
    mock.change.mockResolvedValue({ record, token });
  });
  it("não consulta nem publica automaticamente e oferece conta opcional", () => {
    mock.user = null;
    render(<ManagedCardPanel petId="pet-a" card={card} onLink={vi.fn()} />);
    expect(
      screen.getByRole("link", { name: "Conta e confirmação de e-mail" }),
    ).toHaveAttribute("href", "/account");
    expect(mock.load).not.toHaveBeenCalled();
    expect(mock.change).not.toHaveBeenCalled();
  });
  it("exige consulta, consentimento e revisão antes de publicar", async () => {
    const user = userEvent.setup();
    const link = vi.fn();
    render(<ManagedCardPanel petId="pet-a" card={card} onLink={link} />);
    await user.click(
      screen.getByRole("button", { name: "Consultar link deste pet" }),
    );
    const publish = await screen.findByRole("button", {
      name: "Revisar publicação",
    });
    expect(publish).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(publish);
    expect(mock.change).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Confirmar publicação" }),
    );
    await waitFor(() =>
      expect(mock.change).toHaveBeenCalledWith("user-a", {
        action: "create",
        petId: "pet-a",
        card,
        consent: true,
        expiresInDays: 30,
      }),
    );
    await waitFor(() =>
      expect(link).toHaveBeenLastCalledWith(
        `${window.location.origin}/p/${token}`,
      ),
    );
    const saved = sessionStorage.getItem("pethub:card-token:user-a:pet-a")!;
    expect(saved).toContain(token);
    expect(saved).not.toContain("Luna");
  });
  it("cancela a confirmação se os campos selecionados mudarem", async () => {
    const user = userEvent.setup();
    const link = vi.fn();
    const view = render(
      <ManagedCardPanel petId="pet-a" card={card} onLink={link} />,
    );
    await user.click(
      screen.getByRole("button", { name: "Consultar link deste pet" }),
    );
    await user.click(await screen.findByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Revisar publicação" }),
    );
    view.rerender(
      <ManagedCardPanel
        petId="pet-a"
        card={{ ...card, contact: "11999999999" }}
        onLink={link}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar publicação" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /campos locais mudaram/,
    );
    expect(mock.change).not.toHaveBeenCalled();
  });
  it("exige confirmação para revogar e remove o link da arte", async () => {
    mock.load.mockResolvedValue(record);
    mock.change.mockResolvedValue({
      record: {
        ...record,
        revision: 2,
        card: null,
        revokedAt: "2026-10-25T13:00:00Z",
      },
      token: null,
    });
    sessionStorage.setItem(
      "pethub:card-token:user-a:pet-a",
      JSON.stringify({
        id: record.id,
        tokenVersion: record.tokenVersion,
        token,
      }),
    );
    const user = userEvent.setup();
    const link = vi.fn();
    render(<ManagedCardPanel petId="pet-a" card={card} onLink={link} />);
    await user.click(
      screen.getByRole("button", { name: "Consultar link deste pet" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Encerrar link" }),
    );
    expect(mock.change).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Confirmar revogação" }),
    );
    await waitFor(() =>
      expect(mock.change).toHaveBeenCalledWith("user-a", {
        action: "revoke",
        petId: "pet-a",
        id: record.id,
        expectedRevision: 1,
      }),
    );
    await waitFor(() => expect(link).toHaveBeenLastCalledWith(null));
    expect(sessionStorage.getItem("pethub:card-token:user-a:pet-a")).toBeNull();
  });
  it("descarta respostas de publicação da conta anterior", async () => {
    let resolve!: (value: unknown) => void;
    mock.change.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const user = userEvent.setup();
    const link = vi.fn();
    const view = render(
      <ManagedCardPanel petId="pet-a" card={card} onLink={link} />,
    );
    await user.click(
      screen.getByRole("button", { name: "Consultar link deste pet" }),
    );
    await user.click(await screen.findByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Revisar publicação" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar publicação" }),
    );
    mock.user = { id: "user-b", emailVerified: true };
    view.rerender(<ManagedCardPanel petId="pet-a" card={card} onLink={link} />);
    await act(async () => resolve({ record, token }));
    expect(link).not.toHaveBeenCalledWith(
      `${window.location.origin}/p/${token}`,
    );
    expect(sessionStorage.getItem("pethub:card-token:user-a:pet-a")).toBeNull();
  });
});
