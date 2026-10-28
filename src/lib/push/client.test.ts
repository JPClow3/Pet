// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  disconnectPushForAccount,
  getPushBinding,
  readPushStatus,
} from "./client";
const original = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
const owner = "00000000-0000-4000-8000-000000000001";
const id = "00000000-0000-4000-8000-000000000002";
const unsubscribe = vi.fn();
const binding = {
  installationId: id,
  ownerId: owner,
  consented: true,
  preferences: {
    prevention: true,
    routine: true,
    timeZone: "UTC",
    dailyTime: "09:00",
    quietEnabled: true,
    quietStart: "22:00",
    quietEnd: "07:00",
  },
  revision: 1,
  publicKey: "public",
  signature: null,
  publishedAt: null,
  validUntil: null,
  dirty: false,
  revocationPending: false,
  error: null,
};
beforeEach(() => {
  localStorage.clear();
  getPushBinding();
  localStorage.setItem("pethub:push:binding:v1", JSON.stringify(binding));
  unsubscribe.mockReset().mockResolvedValue(true);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue({ unsubscribe }),
        },
      }),
    },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (original) Object.defineProperty(navigator, "serviceWorker", original);
  else Reflect.deleteProperty(navigator, "serviceWorker");
});
describe("cancelamento dos avisos", () => {
  it("interrompe no navegador e mantém cancelamento remoto pendente offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await disconnectPushForAccount(owner)).toEqual({
      remoteRevoked: false,
    });
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(getPushBinding()).toMatchObject({
      consented: false,
      revocationPending: true,
    });
  });
  it("tenta cancelar mesmo se o armazenamento local falhar", async () => {
    getPushBinding();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota");
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ revoked: true }) }),
    );
    expect(await disconnectPushForAccount(owner)).toEqual({
      remoteRevoked: true,
    });
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(getPushBinding()?.consented).toBe(false);
  });
  it("não cancela a assinatura vinculada a outra conta", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await disconnectPushForAccount("other");
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("não reaproveita consentimento em cache quando o vínculo persistido está corrompido", () => {
    expect(getPushBinding()?.consented).toBe(true);
    localStorage.setItem("pethub:push:binding:v1", "invalid json");
    expect(getPushBinding()).toBeNull();
  });
  it("não afirma cancelamento remoto quando a resposta de sucesso é malformada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ revoked: false }),
      }),
    );
    expect(await disconnectPushForAccount(owner)).toEqual({
      remoteRevoked: false,
    });
    expect(getPushBinding()?.revocationPending).toBe(true);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it("valida configuração e dispositivos antes de expor estado remoto", async () => {
    const status = {
      configuration: { enabled: false, publicKey: null },
      devices: [
        {
          installationId: id,
          revision: 2,
          status: "revoked",
          preferences: binding.preferences,
          publishedAt: "2026-10-25T12:00:00Z",
          validUntil: "2026-11-01T12:00:00Z",
          lastCode: null,
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => status }),
    );
    expect(await readPushStatus(owner)).toEqual(status);
    for (const data of [
      null,
      {},
      { ...status, devices: [null] },
      { ...status, devices: [{ ...status.devices[0], revision: "2" }] },
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
      );
      await expect(readPushStatus(owner)).rejects.toThrow(
        "Não foi possível atualizar os avisos.",
      );
    }
  });
  it("preserva o erro textual do servidor e usa mensagem segura para outro formato", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Confirme o e-mail" }),
      }),
    );
    await expect(readPushStatus(owner)).rejects.toThrow("Confirme o e-mail");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { secret: "bad" } }),
      }),
    );
    await expect(readPushStatus(owner)).rejects.toThrow(
      "Não foi possível atualizar os avisos.",
    );
  });
});
