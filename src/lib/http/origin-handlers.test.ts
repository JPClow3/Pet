import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as authPost } from "@/app/api/auth/[...path]/route";
import { createCardHandlers } from "@/lib/cloud/card-handler";
import { createSnapshotHandlers } from "@/lib/cloud/snapshot-handler";
import { createPushHandlers } from "@/lib/push/handler";

const auth = vi.hoisted(() => ({ configured: vi.fn(), policy: vi.fn() }));
vi.mock("@/lib/cloud/server-auth", () => ({
  getServerAuth: () => auth.configured(),
  verifiedCloudUser: vi.fn(),
}));
vi.mock("@/lib/cloud/auth-policy", () => ({
  checkAccountAction: (...args: unknown[]) => auth.policy(...args),
}));
const currentUser = vi.fn().mockResolvedValue(null);
const cards = createCardHandlers({
  currentUser,
  read: vi.fn(),
  mutate: vi.fn(),
});
const snapshot = createSnapshotHandlers({
  currentUser,
  read: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
});
const push = createPushHandlers({
  currentUser,
  read: vi.fn(),
  publish: vi.fn(),
  revoke: vi.fn(),
  configuration: () => ({ enabled: false, publicKey: null }),
});
beforeEach(() => {
  currentUser.mockClear();
  auth.configured.mockReset().mockReturnValue(null);
  auth.policy.mockReset().mockResolvedValue(null);
});
function request(path: string, origin = "http://127.0.0.1:3105") {
  return new NextRequest(`http://0.0.0.0:3105/api/${path}`, {
    method: "POST",
    headers: {
      Host: "127.0.0.1:3105",
      Origin: origin,
      "X-Forwarded-Host": "evil.test",
    },
  });
}
describe("origem compartilhada pelos endpoints protegidos", () => {
  it("deixa cadastro chegar ao provedor quando Host e Origin reais coincidem", async () => {
    const response = await authPost(request("auth/sign-up/email"), {
      params: Promise.resolve({ path: ["sign-up", "email"] }),
    });
    // No provider is configured in this test; passing the origin guard must reach configuration.
    expect(response.status).toBe(503);
    expect(auth.policy).toHaveBeenCalledOnce();
    expect(auth.configured).toHaveBeenCalledOnce();
  });
  it("deixa carteirinha, backup e push chegar à autenticação com o Host real", async () => {
    for (const [handler, path] of [
      [cards.POST, "cloud/cards"],
      [snapshot.PUT, "cloud/snapshot"],
      [push.PUT, "push/device"],
    ] as const)
      expect((await handler(request(path))).status).toBe(401);
    expect(currentUser).toHaveBeenCalledTimes(3);
  });
  it("nega origem externa antes de autenticação mesmo com forwarded-host adulterado", async () => {
    const response = await authPost(
      request("auth/sign-up/email", "http://evil.test"),
      { params: Promise.resolve({ path: ["sign-up", "email"] }) },
    );
    expect(response.status).toBe(403);
    expect(auth.configured).not.toHaveBeenCalled();
    expect(auth.policy).not.toHaveBeenCalled();
    for (const [handler, path] of [
      [cards.POST, "cloud/cards"],
      [snapshot.PUT, "cloud/snapshot"],
      [push.PUT, "push/device"],
    ] as const)
      expect((await handler(request(path, "http://evil.test"))).status).toBe(
        403,
      );
    expect(currentUser).not.toHaveBeenCalled();
  });
});
