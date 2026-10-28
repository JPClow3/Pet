import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSecurityPanel } from "@/components/account-security-panel";

const mock = vi.hoisted(() => ({
  changePassword: vi.fn(),
  revokeOtherSessions: vi.fn(),
}));
vi.mock("@/lib/cloud/client", () => ({ getCloudClient: () => mock }));
const sessionChanged = vi.fn();
const panel = (id = "owner-a") => (
  <AccountSecurityPanel
    key={id}
    userId={id}
    onSessionChanged={sessionChanged}
  />
);

async function fillPasswords(confirmation = "new-password-secure") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Senha atual"), "current-password");
  await user.type(screen.getByLabelText("Nova senha"), "new-password-secure");
  await user.type(screen.getByLabelText("Confirmar nova senha"), confirmation);
  return user;
}

describe("account security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mock.changePassword.mockResolvedValue({ error: null });
    mock.revokeOtherSessions.mockResolvedValue({ error: null });
    sessionChanged.mockResolvedValue(undefined);
  });
  it("requires matching confirmation before sending a password", async () => {
    render(panel());
    const user = await fillPasswords("different-password");
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    expect(screen.getByRole("alert")).toHaveTextContent("confirmação");
    expect(mock.changePassword).not.toHaveBeenCalled();
  });
  it("changes the password with account binding and revokes other sessions", async () => {
    render(panel());
    const user = await fillPasswords();
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    await waitFor(() =>
      expect(mock.changePassword).toHaveBeenCalledWith(
        {
          currentPassword: "current-password",
          newPassword: "new-password-secure",
          revokeOtherSessions: true,
        },
        { headers: { "X-PetHub-User": "owner-a" } },
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Senha alterada",
    );
    expect(sessionChanged).toHaveBeenCalledOnce();
    for (const label of ["Senha atual", "Nova senha", "Confirmar nova senha"])
      expect(screen.getByLabelText(label)).toHaveValue("");
  });
  it("clears password fields and reports provider failure without claiming success", async () => {
    mock.changePassword.mockResolvedValue({
      error: {
        code: "INVALID_PASSWORD",
        message: "sensitive upstream message",
      },
    });
    render(panel());
    const user = await fillPasswords();
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "senha atual está incorreta",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Senha atual")).toHaveValue("");
    expect(screen.queryByText(/sensitive upstream/)).not.toBeInTheDocument();
    expect(sessionChanged).not.toHaveBeenCalled();
  });
  it("uses the native revoke-other-sessions method and preserves the current session", async () => {
    render(panel());
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sair dos outros aparelhos" }));
    expect(mock.revokeOtherSessions).toHaveBeenCalledWith(
      {},
      { headers: { "X-PetHub-User": "owner-a" } },
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "continua conectado",
    );
    expect(mock.changePassword).not.toHaveBeenCalled();
  });
  it("reports a revocation error without a success message", async () => {
    mock.revokeOtherSessions.mockRejectedValue(new Error("offline"));
    render(panel());
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sair dos outros aparelhos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível concluir",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("discards the previous account's in-flight response", async () => {
    let complete!: (result: { error: null }) => void;
    mock.revokeOtherSessions.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const view = render(panel());
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sair dos outros aparelhos" }));
    view.rerender(panel("owner-b"));
    await act(async () => {
      complete({ error: null });
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(sessionChanged).not.toHaveBeenCalled();
  });
  it("states that account deletion and email changes are unavailable", () => {
    render(panel());
    expect(
      screen.getByText(/excluir a conta ainda não estão disponíveis/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /excluir conta/i }),
    ).not.toBeInTheDocument();
  });
  it("keeps confirmed success if refreshing the session fails", async () => {
    sessionChanged.mockRejectedValue(new Error("offline"));
    render(panel());
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sair dos outros aparelhos" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "sessões foram encerradas",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A ação foi concluída",
    );
  });
});
