import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudAccountPanel } from "@/components/cloud-account-panel";
import { CloudConflictError } from "@/lib/cloud/snapshots";
import { createBackup } from "@/lib/domain/backup";
import { useAppStore } from "@/lib/store/app-store";

const mock = vi.hoisted(() => ({
  user: { id: "user-a", email: "a@example.test", emailVerified: true } as {
    id: string;
    email: string;
    emailVerified: boolean;
  } | null,
  read: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  restore: vi.fn(),
  export: vi.fn(),
  signOut: vi.fn(),
  refetch: vi.fn(),
  signup: vi.fn(),
  otp: vi.fn(),
  resetPassword: vi.fn(),
  disconnectPush: vi.fn(),
}));
vi.mock("@/lib/push/client", () => ({
  disconnectPushForAccount: mock.disconnectPush,
}));
vi.mock("@/lib/cloud/client", () => ({
  getCloudClient: () => ({
    useSession: () => ({
      data: mock.user ? { user: mock.user } : null,
      isPending: false,
      error: null,
      refetch: mock.refetch,
    }),
    getSession: async () => ({
      data: mock.user ? { user: mock.user } : null,
      error: null,
    }),
    signOut: mock.signOut,
    signUp: { email: mock.signup },
    emailOtp: { sendVerificationOtp: mock.otp },
    resetPassword: mock.resetPassword,
  }),
}));
vi.mock("@/lib/cloud/snapshots", async () => ({
  ...(await vi.importActual<typeof import("@/lib/cloud/snapshots")>(
    "@/lib/cloud/snapshots",
  )),
  readCloudSnapshot: mock.read,
  saveCloudSnapshot: mock.save,
  deleteCloudSnapshot: mock.remove,
}));
vi.mock("@/lib/store/app-store", async () => ({
  ...(await vi.importActual<typeof import("@/lib/store/app-store")>(
    "@/lib/store/app-store",
  )),
  exportSnapshot: mock.export,
  restoreSnapshot: mock.restore,
}));
function fixture() {
  return {
    userId: "user-a",
    revision: 3,
    generation: "2ed9062f-808b-4c43-b03f-d368d7c5300d",
    updatedAt: "2026-10-25T12:00:00Z",
    backup: createBackup(useAppStore.getInitialState()),
  };
}

describe("conta Neon opcional", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mock.user = { id: "user-a", email: "a@example.test", emailVerified: true };
    await useAppStore.setState(
      { ...useAppStore.getInitialState(), ready: true },
      true,
    );
    mock.read.mockResolvedValue(fixture());
    mock.export.mockReturnValue(JSON.stringify(fixture().backup));
    mock.save.mockResolvedValue({ ...fixture(), revision: 4 });
    mock.signOut.mockImplementation(async () => {
      mock.user = null;
      return { error: null };
    });
    mock.signup.mockResolvedValue({
      data: { user: { emailVerified: false } },
      error: null,
    });
    mock.otp.mockResolvedValue({ error: null });
    mock.resetPassword.mockResolvedValue({ error: null });
    mock.disconnectPush.mockResolvedValue({ remoteRevoked: true });
  });
  it("entrar não transfere os dados automaticamente", () => {
    render(<CloudAccountPanel />);
    expect(screen.getByText("a@example.test")).toBeInTheDocument();
    expect(mock.read).not.toHaveBeenCalled();
    expect(mock.save).not.toHaveBeenCalled();
    expect(mock.restore).not.toHaveBeenCalled();
  });
  it("exclui a cópia remota mesmo quando o backup local está indisponível", async () => {
    mock.export.mockImplementation(() => {
      throw new Error("A cópia completa excede 100 MB");
    });
    const user = userEvent.setup();
    render(<CloudAccountPanel />);
    await user.click(
      screen.getByRole("button", { name: "Consultar cópia na nuvem" }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Excluir somente a cópia na nuvem",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Excluir cópia na nuvem" }),
    );
    await waitFor(() =>
      expect(mock.remove).toHaveBeenCalledWith(
        "user-a",
        3,
        fixture().generation,
      ),
    );
    expect(mock.export).not.toHaveBeenCalled();
    expect(mock.restore).not.toHaveBeenCalled();
  });
  it("exige consulta, opt-in e confirmação", async () => {
    const user = userEvent.setup();
    render(<CloudAccountPanel />);
    await user.click(
      screen.getByRole("button", { name: "Consultar cópia na nuvem" }),
    );
    const send = await screen.findByRole("button", {
      name: "Revisar envio para a nuvem",
    });
    expect(send).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(send);
    expect(mock.save).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar envio" }));
    await waitFor(() =>
      expect(mock.save).toHaveBeenCalledWith(
        "user-a",
        mock.export(),
        3,
        fixture().generation,
      ),
    );
  });
  it("um conflito preserva dados locais e exige nova consulta", async () => {
    mock.save.mockRejectedValue(new CloudConflictError());
    const user = userEvent.setup();
    render(<CloudAccountPanel />);
    await user.click(
      screen.getByRole("button", { name: "Consultar cópia na nuvem" }),
    );
    await user.click(await screen.findByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Revisar envio para a nuvem" }),
    );
    await user.click(screen.getByRole("button", { name: "Confirmar envio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /mudou em outro aparelho/,
    );
    expect(
      screen.queryByRole("button", { name: "Revisar envio para a nuvem" }),
    ).not.toBeInTheDocument();
    expect(mock.restore).not.toHaveBeenCalled();
  });
  it("não substitui dados editados durante a revisão", async () => {
    const user = userEvent.setup();
    render(<CloudAccountPanel />);
    await user.click(
      screen.getByRole("button", { name: "Consultar cópia na nuvem" }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Revisar restauração neste aparelho",
      }),
    );
    const changed = fixture().backup;
    changed.settings.city = "Rio Verde";
    mock.export.mockReturnValue(JSON.stringify(changed));
    await user.click(
      screen.getByRole("button", { name: "Substituir dados deste aparelho" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /mudaram durante a revisão/,
    );
    expect(mock.restore).not.toHaveBeenCalled();
  });
  it("descarta respostas da conta anterior", async () => {
    let resolveRead!: (value: ReturnType<typeof fixture>) => void;
    mock.read.mockReturnValue(
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
    );
    const user = userEvent.setup();
    const view = render(<CloudAccountPanel />);
    await user.click(
      screen.getByRole("button", { name: "Consultar cópia na nuvem" }),
    );
    mock.user = { id: "user-b", email: "b@example.test", emailVerified: true };
    view.rerender(<CloudAccountPanel />);
    await act(async () => {
      resolveRead(fixture());
    });
    expect(screen.getByText("b@example.test")).toBeInTheDocument();
    expect(screen.queryByText(/Na nuvem:/)).not.toBeInTheDocument();
    expect(mock.restore).not.toHaveBeenCalled();
  });
  it("sair mantém os registros locais", async () => {
    const user = userEvent.setup();
    render(<CloudAccountPanel />);
    await user.click(
      screen.getByRole("button", { name: "Sair da conta neste navegador" }),
    );
    expect(mock.signOut).toHaveBeenCalledOnce();
    expect(mock.disconnectPush).toHaveBeenCalledWith("user-a");
    expect(mock.disconnectPush.mock.invocationCallOrder[0]).toBeLessThan(
      mock.signOut.mock.invocationCallOrder[0],
    );
    expect(mock.restore).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("button", { name: "Entrar" }),
    ).toBeInTheDocument();
  });
  it.each(["pending", "storage failure"])(
    "continua saindo com aviso se a desconexão push falhar: %s",
    async (failure) => {
      if (failure === "pending")
        mock.disconnectPush.mockResolvedValue({ remoteRevoked: false });
      else
        mock.disconnectPush.mockRejectedValue(new Error("Storage unavailable"));
      render(<CloudAccountPanel />);
      await userEvent
        .setup()
        .click(
          screen.getByRole("button", { name: "Sair da conta neste navegador" }),
        );
      expect(await screen.findByRole("status")).toHaveTextContent(
        "desconexão dos avisos no servidor ficou pendente",
      );
      expect(mock.signOut).toHaveBeenCalledOnce();
      expect(mock.restore).not.toHaveBeenCalled();
    },
  );
  it("solicita OTP para cadastro não verificado, mesmo se o provedor permitir entrar", async () => {
    mock.user = null;
    const user = userEvent.setup();
    render(<CloudAccountPanel />);
    await user.click(screen.getByRole("button", { name: "Criar uma conta" }));
    await user.type(screen.getByLabelText("Seu nome"), "João");
    await user.type(screen.getByLabelText("E-mail"), "a@example.test");
    await user.type(screen.getByLabelText("Senha"), "senha-longa-segura");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() =>
      expect(mock.otp).toHaveBeenCalledWith({
        email: "a@example.test",
        type: "email-verification",
      }),
    );
    expect(
      await screen.findByLabelText("Código recebido por e-mail"),
    ).toBeInTheDocument();
    expect(mock.save).not.toHaveBeenCalled();
  });
  it("usa o token de recuperação no método gerenciado de senha", async () => {
    mock.user = null;
    const user = userEvent.setup();
    render(<CloudAccountPanel recoveryToken="reset-token" />);
    await user.type(screen.getByLabelText("Nova senha"), "senha-longa-segura");
    await user.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    await waitFor(() =>
      expect(mock.resetPassword).toHaveBeenCalledWith({
        token: "reset-token",
        newPassword: "senha-longa-segura",
      }),
    );
  });
});
