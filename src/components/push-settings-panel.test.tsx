import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushSettingsPanel } from "./push-settings-panel";
const mocks = vi.hoisted(() => ({
  session: { user: { id: "owner", emailVerified: true } },
  enable: vi.fn(),
  read: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("@/lib/cloud/client", () => ({
  getCloudClient: () => ({
    useSession: () => ({ data: mocks.session, isPending: false }),
  }),
}));
vi.mock("@/lib/push/client", () => ({
  subscribePushBinding: () => () => {},
  getPushBinding: () => null,
  emptyPushBinding: () => null,
  pushSupported: () => true,
  readPushStatus: (...args: unknown[]) => mocks.read(...args),
  enablePush: (...args: unknown[]) => mocks.enable(...args),
  disconnectPushForAccount: (...args: unknown[]) => mocks.disconnect(...args),
  savePushPreferences: vi.fn(),
  syncPushAgenda: vi.fn(),
}));
describe("consentimento para avisos", () => {
  beforeEach(() => {
    mocks.enable.mockReset().mockResolvedValue(undefined);
    mocks.read
      .mockReset()
      .mockResolvedValue({
        configuration: { enabled: true, publicKey: "public" },
        devices: [],
      });
    mocks.session = { user: { id: "owner", emailVerified: true } };
  });
  it("não ativa ao abrir e exige a escolha explícita antes de chamar a assinatura", async () => {
    const user = userEvent.setup();
    render(<PushSettingsPanel />);
    const activate = await screen.findByRole("button", {
      name: "Ativar avisos neste aparelho",
    });
    await waitFor(() => expect(mocks.read).toHaveBeenCalled());
    expect(activate).toBeDisabled();
    expect(mocks.enable).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("checkbox", { name: /Quero enviar os horários/ }),
    );
    await user.click(activate);
    await waitFor(() =>
      expect(mocks.enable).toHaveBeenCalledWith(
        "owner",
        expect.objectContaining({ quietEnabled: true }),
        "public",
      ),
    );
    expect(
      screen.getByText(/Horários dentro desta faixa não geram aviso/),
    ).toBeInTheDocument();
  });
  it("mantém a escolha para tentar novamente quando ativação falha", async () => {
    const user = userEvent.setup();
    mocks.enable.mockRejectedValueOnce(new Error("Permissão bloqueada"));
    render(<PushSettingsPanel />);
    await waitFor(() => expect(mocks.read).toHaveBeenCalled());
    await user.click(
      screen.getByRole("checkbox", { name: /Quero enviar os horários/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Ativar avisos neste aparelho" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Permissão bloqueada",
    );
    expect(
      screen.getByRole("checkbox", { name: /Quero enviar os horários/ }),
    ).toBeChecked();
  });
  it("não oferece ativação antes de confirmar o e-mail", () => {
    mocks.session = { user: { id: "owner", emailVerified: false } };
    render(<PushSettingsPanel />);
    expect(
      screen.getByRole("link", { name: "Conta e confirmação de e-mail" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ativar avisos neste aparelho" }),
    ).not.toBeInTheDocument();
    expect(mocks.enable).not.toHaveBeenCalled();
  });
});
