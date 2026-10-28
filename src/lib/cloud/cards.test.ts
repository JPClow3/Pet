import { afterEach, describe, expect, it, vi } from "vitest";
import { CardConflictError, changeManagedCard, loadManagedCard } from "./cards";

const record = {
  id: "00000000-0000-4000-8000-000000000001",
  petId: "pet-1",
  revision: 1,
  tokenVersion: "00000000-0000-4000-8000-000000000002",
  expiresAt: "2026-11-01T12:00:00Z",
  updatedAt: "2026-10-25T12:00:00Z",
  revokedAt: null,
  card: null,
};
const mutation = {
  action: "revoke" as const,
  petId: record.petId,
  id: record.id,
  expectedRevision: 1,
};
function respond(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json(body, { status })),
  );
}
afterEach(() => vi.unstubAllGlobals());
describe("respostas dos links gerenciados", () => {
  it("valida o envelope e distingue ausência de link de resposta malformada", async () => {
    respond({ record: null });
    expect(await loadManagedCard("owner", "pet-1")).toBeNull();
    respond({ record });
    expect(await loadManagedCard("owner", "pet-1")).toEqual(record);
    for (const body of [null, [], {}, { record: { id: record.id } }]) {
      respond(body);
      await expect(loadManagedCard("owner", "pet-1")).rejects.toThrow(
        "Resposta de link inválida.",
      );
    }
  });
  it("aceita somente registro e token válidos após a mutação", async () => {
    for (const token of [null, `c_${"a".repeat(43)}`]) {
      respond({ record, token });
      expect(await changeManagedCard("owner", mutation)).toEqual({
        record,
        token,
      });
    }
    for (const body of [
      null,
      { record },
      { record, token: 123 },
      { record, token: "unsafe" },
      { record: null, token: null },
    ]) {
      respond(body);
      await expect(changeManagedCard("owner", mutation)).rejects.toThrow(
        "Resposta de link inválida.",
      );
    }
  });
  it("preserva erros de conflito, sessão e conexão", async () => {
    respond({}, 409);
    await expect(loadManagedCard("owner", "pet-1")).rejects.toBeInstanceOf(
      CardConflictError,
    );
    respond({}, 403);
    await expect(loadManagedCard("owner", "pet-1")).rejects.toThrow(
      "Entre na conta e confirme o e-mail antes de gerenciar links.",
    );
    respond({}, 503);
    await expect(loadManagedCard("owner", "pet-1")).rejects.toThrow(
      "Não foi possível acessar os links. Tente novamente quando estiver conectado.",
    );
  });
});
