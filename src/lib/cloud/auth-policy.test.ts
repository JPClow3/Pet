import { describe, expect, it, vi } from "vitest";
import { checkAccountAction } from "@/lib/cloud/auth-policy";

const user = { id: "owner-a", emailVerified: true };
const request = (owner = user.id, method = "POST") =>
  new Request("https://pet.example/api/auth/change-password", {
    method,
    headers: { Origin: "https://pet.example", "X-PetHub-User": owner },
  });

describe("account action boundary", () => {
  it.each([
    "delete-user",
    "delete-user/callback",
    "delete-user/",
    "admin/remove-user",
  ])(
    "blocks unsupported deletion %s before any provider call",
    async (path) => {
      const currentUser = vi.fn();
      const result = await checkAccountAction(
        request(user.id, "GET"),
        path,
        currentUser,
      );
      expect(result?.status).toBe(403);
      expect(await result?.json()).toMatchObject({
        code: "ACCOUNT_DELETION_UNAVAILABLE",
      });
      expect(result?.headers.get("cache-control")).toContain("no-store");
      expect(currentUser).not.toHaveBeenCalled();
    },
  );
  it.each([
    "change-password",
    "revoke-other-sessions",
    "revoke-sessions",
    "revoke-session",
  ])("rejects an account switch before forwarding %s", async (path) => {
    const result = await checkAccountAction(
      request("old-owner"),
      path,
      async () => user,
    );
    expect(result?.status).toBe(403);
    expect(await result?.json()).toMatchObject({ code: "ACCOUNT_CHANGED" });
  });
  it("requires a current verified session and the correct method", async () => {
    expect(
      (await checkAccountAction(request(), "change-password", async () => null))
        ?.status,
    ).toBe(401);
    expect(
      (
        await checkAccountAction(request(), "change-password", async () => ({
          ...user,
          emailVerified: false,
        }))
      )?.status,
    ).toBe(403);
    expect(
      (
        await checkAccountAction(
          request(user.id, "GET"),
          "change-password",
          async () => user,
        )
      )?.status,
    ).toBe(405);
    expect(
      (
        await checkAccountAction(request(), "change-password", async () => {
          throw new Error("offline");
        })
      )?.status,
    ).toBe(503);
  });
  it("allows a matching account and leaves normal auth flows to the SDK", async () => {
    expect(
      await checkAccountAction(
        request(),
        "revoke-other-sessions",
        async () => user,
      ),
    ).toBeNull();
    const currentUser = vi.fn();
    expect(
      await checkAccountAction(request(), "sign-in/email", currentUser),
    ).toBeNull();
    expect(currentUser).not.toHaveBeenCalled();
  });
});
