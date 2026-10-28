import { describe, expect, it, vi } from "vitest";
import { pushOutcome, sendPushJob } from "./dispatcher";
import { safePushNotification, safePushClickUrl } from "./notification";
import { buildPushPayload } from "@block65/webcrypto-web-push";
vi.mock("@block65/webcrypto-web-push", () => ({
  buildPushPayload: vi
    .fn()
    .mockResolvedValue({ method: "POST", body: "encrypted" }),
}));
const now = new Date("2026-10-25T12:00:00Z");
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/synthetic",
  expirationTime: null,
  keys: {
    p256dh: Buffer.from([4, ...new Array(64).fill(1)]).toString("base64url"),
    auth: Buffer.alloc(16, 2).toString("base64url"),
  },
};
const validJob = {
  job_id: "id",
  installation_id: "device",
  lease_id: "lease",
  occurrence_key: "routine:opaque-record:2026-10-25T12:00",
  subscription,
  expires_at: "2026-10-25T13:00:00Z",
  attempts: 1,
};
describe("entrega de avisos", () => {
  it("distingue aceitação, erro permanente, retry e prazo esgotado", () => {
    const expiry = "2026-10-25T13:00:00Z";
    expect(pushOutcome(201, 1, expiry, now).status).toBe("accepted");
    expect(pushOutcome(410, 1, expiry, now).status).toBe("failed");
    expect(pushOutcome(403, 1, expiry, now).status).toBe("failed");
    expect(pushOutcome(429, 1, expiry, now, "120")).toEqual({
      status: "retry",
      code: 429,
      retryAt: "2026-10-25T12:02:00.000Z",
    });
    expect(pushOutcome(null, 5, expiry, now).status).toBe("failed");
    expect(pushOutcome(503, 1, "2026-10-25T12:00:30Z", now).status).toBe(
      "expired",
    );
  });
  it("não faz requisição para endpoint não permitido nem para aviso expirado", async () => {
    const fetcher = vi.fn();
    const job = {
      job_id: "id",
      installation_id: "device",
      lease_id: "lease",
      occurrence_key: "key",
      subscription: { endpoint: "http://127.0.0.1/secret" },
      expires_at: "2026-10-25T13:00:00Z",
      attempts: 1,
    };
    await sendPushJob(job, {}, fetcher, now);
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      (
        await sendPushJob(
          { ...job, expires_at: "2026-10-25T11:00:00Z" },
          {},
          fetcher,
          now,
        )
      ).status,
    ).toBe("expired");
  });
  it("ignora conteúdo e destino externos do payload e não confirma cuidado", () => {
    const notification = safePushNotification({
      title: "Segredo",
      body: "Dose privada",
      url: "https://evil.test",
      tag: "a".repeat(32),
    });
    expect(JSON.stringify(notification)).not.toContain("Segredo");
    expect(JSON.stringify(notification)).not.toContain("Dose privada");
    expect(notification.options.data.url).toBe("/reminders");
    expect(notification.options.renotify).toBe(false);
    expect(safePushClickUrl("https://pethub.test")).toBe(
      "https://pethub.test/reminders",
    );
  });
  it("envia apenas texto genérico, limita TTL e não segue redirecionamento", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));
    expect(await sendPushJob(validJob, {}, fetcher, now)).toMatchObject({
      status: "accepted",
    });
    expect(fetcher).toHaveBeenCalledWith(
      subscription.endpoint,
      expect.objectContaining({ redirect: "manual", body: "encrypted" }),
    );
    const message = vi.mocked(buildPushPayload).mock.calls.at(-1)?.[0];
    expect(message).toMatchObject({
      options: { ttl: 300, urgency: "normal" },
      data: { title: "Zelupi", url: "/reminders" },
    });
    expect(JSON.stringify(message)).not.toContain("opaque-record");
    expect((message?.data as { tag: string }).tag).toMatch(/^[a-f0-9]{32}$/);
  });
  it("reconfere o silêncio atual sem enviar nem adiar a ocorrência", async () => {
    const fetcher = vi.fn();
    const result = await sendPushJob(
      {
        ...validJob,
        preferences: {
          prevention: true,
          routine: true,
          timeZone: "UTC",
          dailyTime: "09:00",
          quietEnabled: true,
          quietStart: "11:00",
          quietEnd: "13:00",
        },
      },
      {},
      fetcher,
      now,
    );
    expect(result).toEqual({ status: "suppressed", code: null, retryAt: null });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("recusa redirecionamento do provedor sem tentar o destino de Location", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: "https://evil.test/private" },
      }),
    );
    expect(await sendPushJob(validJob, {}, fetcher, now)).toEqual({
      status: "failed",
      code: 302,
      retryAt: null,
    });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe(subscription.endpoint);
    expect(fetcher.mock.calls[0][1].redirect).toBe("manual");
  });
});
