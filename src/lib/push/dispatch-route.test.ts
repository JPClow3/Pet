import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/push/dispatch/route";
import * as dispatcher from "@/lib/push/dispatcher";

describe("POST /api/push/dispatch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.PUSH_DISPATCH_SECRET;
  });

  it("retorna 401 se nenhum segredo estiver configurado no servidor", async () => {
    const request = new Request("https://example.com/api/push/dispatch", {
      method: "POST",
      headers: {
        authorization: "Bearer qualquertoken",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string };
    expect(body).toEqual({ error: "Não autorizado" });
  });

  it("retorna 401 se header Authorization for inválido ou ausente", async () => {
    process.env.CRON_SECRET = "super-secret-token";

    const noHeaderRequest = new Request("https://example.com/api/push/dispatch", {
      method: "POST",
    });
    const res1 = await POST(noHeaderRequest);
    expect(res1.status).toBe(401);

    const wrongTokenRequest = new Request("https://example.com/api/push/dispatch", {
      method: "POST",
      headers: {
        authorization: "Bearer wrong-token",
      },
    });
    const res2 = await POST(wrongTokenRequest);
    expect(res2.status).toBe(401);
  });

  it("executa dispatchPush e retorna 200 quando token for válido", async () => {
    process.env.CRON_SECRET = "super-secret-token";
    process.env.PUSH_ENABLED = "true";

    const dispatchSpy = vi.spyOn(dispatcher, "dispatchPush").mockResolvedValue({
      configured: true,
      attempted: 2,
      accepted: 2,
      failed: 0,
      suppressed: 0,
      retried: 0,
      expired: 0,
      batches: 1,
    });

    const request = new Request("https://example.com/api/push/dispatch", {
      method: "POST",
      headers: {
        authorization: "Bearer super-secret-token",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; result: { attempted: number } };
    expect(body.ok).toBe(true);
    expect(body.result.attempted).toBe(2);
    expect(dispatchSpy).toHaveBeenCalledOnce();
  });
});
