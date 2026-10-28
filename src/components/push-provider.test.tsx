import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushSyncProvider } from "@/lib/push/provider";

const mocks = vi.hoisted(() => ({
  user: null as { id: string; emailVerified: boolean } | null,
  binding: { ownerId: "owner", consented: true } as {
    ownerId: string;
    consented: boolean;
  } | null,
  session: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("@/lib/cloud/client", () => ({
  getCloudClient: () => ({
    useSession: () => {
      mocks.session();
      return {
        data: mocks.user ? { user: mocks.user } : null,
        isPending: false,
      };
    },
  }),
}));
vi.mock("@/lib/push/client", () => ({
  subscribePushBinding: () => () => {},
  getPushBinding: () => mocks.binding,
  emptyPushBinding: () => null,
  startPushSync: (...args: unknown[]) => mocks.start(...args),
  disconnectPushForAccount: (...args: unknown[]) => mocks.disconnect(...args),
}));
beforeEach(() => {
  mocks.user = null;
  mocks.binding = { ownerId: "owner", consented: true };
  mocks.session.mockClear();
  mocks.stop.mockClear();
  mocks.start.mockReset().mockReturnValue(mocks.stop);
  mocks.disconnect.mockReset().mockResolvedValue({ remoteRevoked: true });
});
describe("sincronização dos avisos", () => {
  it("não transforma sessão ausente/offline em cancelamento", () => {
    render(<PushSyncProvider />);
    expect(mocks.disconnect).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("sincroniza apenas a conta confirmada e encerra observadores ao sair da tela", () => {
    mocks.user = { id: "owner", emailVerified: true };
    const view = render(<PushSyncProvider />);
    expect(mocks.start).toHaveBeenCalledWith("owner");
    view.unmount();
    expect(mocks.stop).toHaveBeenCalledOnce();
  });
  it("cancela o vínculo antigo quando uma conta diferente é confirmada", () => {
    mocks.user = { id: "other", emailVerified: true };
    render(<PushSyncProvider />);
    expect(mocks.disconnect).toHaveBeenCalledWith("owner");
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("não consulta sessão para uso local sem vínculo de avisos", () => {
    mocks.binding = null;
    render(<PushSyncProvider />);
    expect(mocks.session).not.toHaveBeenCalled();
  });
});
