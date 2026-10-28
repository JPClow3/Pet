import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCardHandlers } from "./card-handler";
import { createCardToken, hashCardToken } from "./card-tokens";
import { MANAGED_CARD_TOKEN } from "@/lib/domain/managed-card";
const card = {
  v: 1,
  name: "Luna",
  species: "gato",
  breed: null,
  city: null,
  lost: null,
  health: null,
  contact: null,
};
const id = "2ed9062f-808b-4c43-b03f-d368d7c5300d";
const services = { currentUser: vi.fn(), read: vi.fn(), mutate: vi.fn() };
const handlers = createCardHandlers(services);
const request = (body?: unknown, headers: Record<string, string> = {}) =>
  new Request("https://pet.test/api/cloud/cards?petId=pet-a", {
    method: body ? "POST" : "GET",
    headers: {
      Origin: "https://pet.test",
      "Content-Type": "application/json",
      "X-PetHub-User": "user-a",
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
describe("publicação de carteirinha", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    services.currentUser.mockResolvedValue({
      id: "user-a",
      emailVerified: true,
    });
    services.read.mockResolvedValue(null);
    services.mutate.mockResolvedValue({ record: { id }, token: "opaque" });
  });
  it("nega acesso sem conta, e-mail verificado ou identidade atual", async () => {
    services.currentUser.mockResolvedValue(null);
    expect((await handlers.GET(request())).status).toBe(401);
    services.currentUser.mockResolvedValue({
      id: "user-a",
      emailVerified: false,
    });
    expect((await handlers.GET(request())).status).toBe(403);
    services.currentUser.mockResolvedValue({
      id: "user-b",
      emailVerified: true,
    });
    expect((await handlers.GET(request())).status).toBe(403);
    expect(services.read).not.toHaveBeenCalled();
  });
  it("exige origem e consentimento explícito, sem aceitar o perfil inteiro", async () => {
    const input = {
      action: "create",
      petId: "pet-a",
      card,
      expiresInDays: 30,
      consent: true,
    };
    expect(
      (await handlers.POST(request(input, { Origin: "https://evil.test" })))
        .status,
    ).toBe(403);
    expect(
      (await handlers.POST(request({ ...input, consent: false }))).status,
    ).toBe(400);
    expect(
      (
        await handlers.POST(
          request({
            ...input,
            card: { ...card, ownerEmail: "private@example.test" },
          }),
        )
      ).status,
    ).toBe(400);
    expect(services.mutate).not.toHaveBeenCalled();
  });
  it("envia somente campos públicos e responde sem cache", async () => {
    const input = {
      action: "create",
      petId: "pet-a",
      card: {
        ...card,
        lost: { since: null, note: "Encontrado", privateNote: "não publicar" },
      },
      expiresInDays: 7,
      consent: true,
    };
    const result = await handlers.POST(request(input));
    expect(result.status).toBe(200);
    expect(services.mutate.mock.calls[0][1].card.lost).toEqual({
      since: null,
      note: "Encontrado",
    });
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(result.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("exige revisão para alterar ou revogar e mantém conflitos", async () => {
    expect(
      (await handlers.POST(request({ action: "revoke", petId: "pet-a", id })))
        .status,
    ).toBe(400);
    services.mutate.mockResolvedValue(null);
    expect(
      (
        await handlers.POST(
          request({
            action: "revoke",
            petId: "pet-a",
            id,
            expectedRevision: 1,
          }),
        )
      ).status,
    ).toBe(409);
  });
  it("limita corpo e prazo da publicação", async () => {
    const input = {
      action: "create",
      petId: "pet-a",
      card,
      expiresInDays: 365,
      consent: true,
    };
    expect((await handlers.POST(request(input))).status).toBe(400);
    expect(
      (
        await handlers.POST(
          request({ ...input, card: { ...card, name: "x".repeat(14000) } }),
        )
      ).status,
    ).toBe(400);
    expect(services.mutate).not.toHaveBeenCalled();
  });
});
describe("token opaco", () => {
  it("gera 256 bits aleatórios e guarda somente hash verificável", async () => {
    const one = createCardToken();
    const two = createCardToken();
    expect(one).toMatch(MANAGED_CARD_TOKEN);
    expect(two).not.toBe(one);
    const hash = await hashCardToken(one);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(one);
    expect(await hashCardToken(one)).toBe(hash);
    await expect(hashCardToken("legacy-payload")).rejects.toThrow();
  });
});
