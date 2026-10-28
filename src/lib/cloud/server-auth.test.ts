import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ session: vi.fn(), create: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@neondatabase/auth/next/server", () => ({
  createNeonAuth: mock.create,
}));

describe("verificação de sessão privada", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example.test/auth");
    vi.stubEnv(
      "NEON_AUTH_COOKIE_SECRET",
      "test-secret-with-at-least-thirty-two-characters",
    );
    mock.create.mockReturnValue({ getSession: mock.session });
  });

  it("ignora o cache assinado e exige a sessão atual do provedor", async () => {
    const user = { id: "user-a", emailVerified: true };
    mock.session.mockResolvedValue({ data: { user }, error: null });
    const { verifiedCloudUser } = await import("./server-auth");
    expect(await verifiedCloudUser()).toEqual(user);
    expect(mock.session).toHaveBeenCalledWith({
      query: { disableCookieCache: "true" },
    });
    expect(mock.create.mock.calls[0][0].cookies.sessionDataTtl).toBeGreaterThan(
      0,
    );
  });

  it("não autoriza uma sessão quando a verificação remota falha", async () => {
    mock.session.mockResolvedValue({
      data: null,
      error: { message: "offline" },
    });
    const { verifiedCloudUser } = await import("./server-auth");
    await expect(verifiedCloudUser()).rejects.toThrow(
      "Session verification failed",
    );
  });

  it("não cria cliente sem configuração de autenticação", async () => {
    vi.stubEnv("NEON_AUTH_BASE_URL", "");
    const { verifiedCloudUser } = await import("./server-auth");
    expect(await verifiedCloudUser()).toBeNull();
    expect(mock.create).not.toHaveBeenCalled();
  });
});
