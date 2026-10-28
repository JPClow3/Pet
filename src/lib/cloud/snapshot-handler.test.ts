import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBackup } from "@/lib/domain/backup";
import { useAppStore } from "@/lib/store/app-store";
import { createSnapshotHandlers } from "./snapshot-handler";

const backup = createBackup(useAppStore.getInitialState());
const generation = "2ed9062f-808b-4c43-b03f-d368d7c5300d";
const services = {
  currentUser: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
};
const handlers = createSnapshotHandlers(services);
function request(
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request("https://pet.test/api/cloud/snapshot", {
    method,
    headers: {
      Origin: "https://pet.test",
      "Content-Type": "application/json",
      "X-PetHub-User": "user-a",
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
describe("autorização de snapshots no servidor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    services.currentUser.mockResolvedValue({
      id: "user-a",
      emailVerified: true,
    });
    services.read.mockResolvedValue(null);
    services.save.mockResolvedValue({ revision: 1 });
    services.remove.mockResolvedValue(true);
  });
  it("nega acesso direto sem sessão antes de consultar o banco", async () => {
    services.currentUser.mockResolvedValue(null);
    expect((await handlers.GET(request())).status).toBe(401);
    expect(services.read).not.toHaveBeenCalled();
  });
  it("nega e-mail não confirmado e identidade de outra conta", async () => {
    services.currentUser.mockResolvedValue({
      id: "user-a",
      emailVerified: false,
    });
    expect((await handlers.GET(request())).status).toBe(403);
    services.currentUser.mockResolvedValue({
      id: "user-b",
      emailVerified: true,
    });
    expect(
      (
        await handlers.PUT(
          request("PUT", { expectedRevision: 0, snapshot: backup }),
        )
      ).status,
    ).toBe(403);
    expect(services.save).not.toHaveBeenCalled();
  });
  it("recusa mutação de outra origem", async () => {
    expect(
      (
        await handlers.PUT(
          request(
            "PUT",
            { expectedRevision: 0, snapshot: backup },
            { Origin: "https://evil.test" },
          ),
        )
      ).status,
    ).toBe(403);
    expect(services.currentUser).not.toHaveBeenCalled();
  });
  it("protege respostas contra cache e consulta o usuário verificado", async () => {
    const result = await handlers.GET(request());
    expect(result.headers.get("Cache-Control")).toContain("no-store");
    expect(services.read).toHaveBeenCalledWith("user-a");
  });
  it("valida schema completo antes da escrita", async () => {
    expect(
      (
        await handlers.PUT(
          request("PUT", { expectedRevision: 0, snapshot: {} }),
        )
      ).status,
    ).toBe(400);
    expect(services.save).not.toHaveBeenCalled();
    expect(
      (
        await handlers.PUT(
          request("PUT", { expectedRevision: 0, snapshot: backup }),
        )
      ).status,
    ).toBe(200);
    expect(services.save).toHaveBeenCalledWith("user-a", backup, 0, null);
  });
  it("recusa corpo grande declarado sem executar escrita", async () => {
    const result = await handlers.PUT(
      request(
        "PUT",
        { expectedRevision: 0, snapshot: backup },
        { "Content-Length": "30000000" },
      ),
    );
    expect(result.status).toBe(400);
    expect(services.save).not.toHaveBeenCalled();
  });
  it("mantém conflito de atualização e exclusão explícito", async () => {
    services.save.mockResolvedValue(null);
    services.remove.mockResolvedValue(false);
    expect(
      (
        await handlers.PUT(
          request("PUT", {
            expectedRevision: 1,
            expectedGeneration: generation,
            snapshot: backup,
          }),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await handlers.DELETE(
          request("DELETE", {
            expectedRevision: 1,
            expectedGeneration: generation,
          }),
        )
      ).status,
    ).toBe(409);
  });
  it("não aceita revisão antiga sem a identidade da cópia", async () => {
    const result = await handlers.PUT(
      request("PUT", { expectedRevision: 1, snapshot: backup }),
    );
    expect(result.status).toBe(400);
    expect(services.save).not.toHaveBeenCalled();
  });
});
