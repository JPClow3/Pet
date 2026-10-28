import { describe, expect, it, vi } from "vitest";
import { createPushHandlers } from "./handler";
const userId = "00000000-0000-4000-8000-000000000001";
const id = "00000000-0000-4000-8000-000000000002";
const now = new Date("2026-10-25T12:00:00Z");
function subscription() {
  return {
    endpoint: "https://fcm.googleapis.com/fcm/send/test",
    expirationTime: null,
    keys: {
      p256dh: Buffer.from([4, ...Array(64).fill(1)]).toString("base64url"),
      auth: Buffer.alloc(16, 2).toString("base64url"),
    },
  };
}
const preferences = {
  prevention: true,
  routine: true,
  timeZone: "America/Sao_Paulo",
  dailyTime: "09:00",
  quietEnabled: true,
  quietStart: "22:00",
  quietEnd: "07:00",
};
function services() {
  return {
    currentUser: vi.fn().mockResolvedValue({ id: userId, emailVerified: true }),
    read: vi.fn().mockResolvedValue([]),
    publish: vi.fn().mockResolvedValue({ installationId: id, revision: 1 }),
    revoke: vi.fn().mockResolvedValue(undefined),
    configuration: () => ({ enabled: true, publicKey: "public-key" }),
    now: () => now,
  };
}
const body = () => ({
  installationId: id,
  expectedRevision: 0,
  subscription: subscription(),
  preferences,
  agenda: {
    generatedAt: now.toISOString(),
    validUntil: "2026-11-01T12:00:00Z",
    occurrences: [
      {
        key: "med:opaque:2026-10-25T15:00",
        kind: "routine",
        dueAt: "2026-10-25T15:00:00Z",
        expiresAt: "2026-10-25T15:30:00Z",
        suppressed: false,
      },
    ],
  },
  consent: true,
  vapidPublicKey: "public-key",
});
function request(
  method = "PUT",
  payload: unknown = body(),
  headers: Record<string, string> = {},
) {
  return new Request("https://pethub.test/api/push/device", {
    method,
    headers: {
      Origin: "https://pethub.test",
      "Content-Type": "application/json",
      "X-PetHub-User": userId,
      ...headers,
    },
    ...(method !== "GET" ? { body: JSON.stringify(payload) } : {}),
  });
}
describe("API de avisos por aparelho", () => {
  it("exige sessão, e-mail confirmado, origem e identidade corrente", async () => {
    const s = services();
    const h = createPushHandlers(s);
    s.currentUser.mockResolvedValueOnce(null);
    expect((await h.PUT(request())).status).toBe(401);
    s.currentUser.mockResolvedValueOnce({ id: userId, emailVerified: false });
    expect((await h.PUT(request())).status).toBe(403);
    expect(
      (await h.PUT(request("PUT", body(), { Origin: "https://other.test" })))
        .status,
    ).toBe(403);
    expect(
      (await h.PUT(request("PUT", body(), { "X-PetHub-User": "other" })))
        .status,
    ).toBe(403);
    expect(s.publish).not.toHaveBeenCalled();
  });
  it("rejeita endpoint arbitrário, agenda vencida, falta de consentimento e campos extras", async () => {
    const s = services();
    const h = createPushHandlers(s);
    for (const payload of [
      {
        ...body(),
        subscription: {
          ...subscription(),
          endpoint: "https://127.0.0.1/internal",
        },
      },
      {
        ...body(),
        agenda: { ...body().agenda, generatedAt: "2026-10-24T12:00:00Z" },
      },
      { ...body(), consent: false },
      { ...body(), petName: "segredo" },
    ])
      expect((await h.PUT(request("PUT", payload))).status).toBe(400);
    expect(s.publish).not.toHaveBeenCalled();
  });
  it("publica apenas para o dono verificado e não esconde conflito de revisão", async () => {
    const s = services();
    const h = createPushHandlers(s);
    const result = await h.PUT(request());
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(s.publish).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ installationId: id }),
    );
    s.publish.mockResolvedValueOnce(null);
    expect((await h.PUT(request())).status).toBe(409);
  });
  it("permite revogar quando o envio está desabilitado", async () => {
    const s = services();
    s.configuration = () => ({ enabled: false, publicKey: "public-key" });
    const h = createPushHandlers(s);
    expect(
      (await h.DELETE(request("DELETE", { installationId: id }))).status,
    ).toBe(200);
    expect(s.revoke).toHaveBeenCalledWith(userId, id);
  });
  it("aceita republicação de ocorrência recente sem deslocar horário ou vencimento", async () => {
    const s = services();
    const h = createPushHandlers(s);
    const payload = body();
    payload.agenda.occurrences[0] = {
      ...payload.agenda.occurrences[0],
      dueAt: "2026-10-25T11:59:00Z",
      expiresAt: "2026-10-25T12:29:00Z",
    };
    expect((await h.PUT(request("PUT", payload))).status).toBe(200);
    expect(s.publish).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        agenda: expect.objectContaining({
          occurrences: payload.agenda.occurrences,
        }),
      }),
    );
    for (const occurrence of [
      { ...payload.agenda.occurrences[0], dueAt: "2026-10-25T05:59:00Z" },
      { ...payload.agenda.occurrences[0], expiresAt: "2026-10-25T12:00:00Z" },
      { ...payload.agenda.occurrences[0], expiresAt: "2026-10-25T18:00:00Z" },
    ])
      expect(
        (
          await h.PUT(
            request("PUT", {
              ...payload,
              agenda: { ...payload.agenda, occurrences: [occurrence] },
            }),
          )
        ).status,
      ).toBe(400);
  });
});
