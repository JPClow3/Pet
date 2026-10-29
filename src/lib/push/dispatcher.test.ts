import { describe, expect, it, vi } from "vitest";
import { dispatchPush, pushOutcome, sendPushJob, type PushEnvironment } from "./dispatcher";
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

describe("dispatchPush", () => {
  const completeEnv: PushEnvironment = {
    PUSH_ENABLED: "true",
    PUSH_DATABASE_URL: "postgresql://user:pass@localhost/db",
    PUSH_VAPID_PUBLIC_KEY: "pubkey",
    PUSH_VAPID_PRIVATE_KEY: "privkey",
    PUSH_VAPID_SUBJECT: "https://example.com",
  };

  it("retorna configured=false quando PUSH_ENABLED != 'true'", async () => {
    const result = await dispatchPush({
      ...completeEnv,
      PUSH_ENABLED: "false",
    });
    expect(result).toEqual({
      configured: false,
      attempted: 0,
      accepted: 0,
      failed: 0,
      suppressed: 0,
      retried: 0,
      expired: 0,
      batches: 0,
    });
  });

  it("retorna configured=false quando faltam variáveis de ambiente", async () => {
    expect(await dispatchPush({ ...completeEnv, PUSH_DATABASE_URL: "" })).toEqual(
      expect.objectContaining({ configured: false, attempted: 0 }),
    );
    expect(await dispatchPush({ ...completeEnv, PUSH_VAPID_PUBLIC_KEY: "" })).toEqual(
      expect.objectContaining({ configured: false, attempted: 0 }),
    );
    expect(await dispatchPush({ ...completeEnv, PUSH_VAPID_PRIVATE_KEY: "" })).toEqual(
      expect.objectContaining({ configured: false, attempted: 0 }),
    );
    expect(await dispatchPush({ ...completeEnv, PUSH_VAPID_SUBJECT: "" })).toEqual(
      expect.objectContaining({ configured: false, attempted: 0 }),
    );
  });

  it("busca e processa jobs via executeOverride quando ativo", async () => {
    const executedQueries: string[] = [];
    const mockJobs = [
      {
        ...validJob,
        job_id: "00000000-0000-0000-0000-000000000001",
        installation_id: "00000000-0000-0000-0000-000000000002",
        lease_id: "00000000-0000-0000-0000-000000000003",
      },
    ];

    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));

    const executeOverride = vi.fn().mockImplementation((query: unknown) => {
      // Query in neon can be serialized as JSON or query strings
      const q = typeof query === "string" ? query : JSON.stringify(query);
      executedQueries.push(q);

      // Claim query
      if (q.includes("claim_push_jobs")) {
        return Promise.resolve(mockJobs);
      }
      // Validation query
      if (q.includes("push_claim_valid")) {
        return Promise.resolve([
          {
            valid: true,
            preferences: {
              prevention: true,
              routine: true,
              timeZone: "UTC",
              dailyTime: "09:00",
              quietEnabled: false,
              quietStart: "22:00",
              quietEnd: "07:00",
            },
          },
        ]);
      }
      // Finish query
      if (q.includes("finish_push_job")) {
        return Promise.resolve(true);
      }
      return Promise.resolve([]);
    });

    const result = await dispatchPush(completeEnv, {
      executeOverride,
      fetcher,
      now: () => now,
      maxBatches: 1,
    });

    expect(result.configured).toBe(true);
    expect(result.attempted).toBe(1);
    expect(result.accepted).toBe(1);
    expect(result.batches).toBe(1);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(executedQueries.some((q) => q.includes("claim_push_jobs"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("push_claim_valid"))).toBe(true);
    expect(executedQueries.some((q) => q.includes("finish_push_job"))).toBe(true);
  });

  it("respeita batch size e drena jobs vazios sem loops infinitos", async () => {
    const executeOverride = vi.fn().mockResolvedValue([]);
    const result = await dispatchPush(completeEnv, {
      executeOverride,
      maxBatches: 3,
    });

    expect(result.configured).toBe(true);
    expect(result.attempted).toBe(0);
    expect(result.batches).toBe(0);
    expect(executeOverride).toHaveBeenCalledOnce();
  });
});
