import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBackup } from "@/lib/domain/backup";
import { useAppStore } from "@/lib/store/app-store";
import {
  backupContentSignature,
  CloudConflictError,
  deleteCloudSnapshot,
  parseCloudSnapshot,
  readCloudSnapshot,
  saveCloudSnapshot,
} from "./snapshots";

const backup = createBackup(useAppStore.getInitialState());
const row = {
  user_id: "user-a",
  snapshot: backup,
  revision: 1,
  generation: "2ed9062f-808b-4c43-b03f-d368d7c5300d",
  updated_at: "2026-10-25T12:00:00Z",
};
const fetchMock = vi.fn();
describe("cópias cloud via API autenticada", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  it("valida o proprietário e o backup recebido", () => {
    expect(parseCloudSnapshot(row, "user-a").backup).toEqual(backup);
    expect(() => parseCloudSnapshot(row, "user-b")).toThrow(/outra conta/);
    expect(() =>
      parseCloudSnapshot({ ...row, snapshot: {} }, "user-a"),
    ).toThrow();
  });
  it("consulta sem cache e informa a identidade esperada", async () => {
    fetchMock.mockResolvedValue(Response.json({ snapshot: row }));
    await readCloudSnapshot("user-a");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cloud/snapshot",
      expect.objectContaining({
        credentials: "same-origin",
        cache: "no-store",
        headers: expect.objectContaining({ "X-PetHub-User": "user-a" }),
      }),
    );
  });
  it("envia revisão conhecida e backup validado", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ snapshot: { ...row, revision: 2 } }),
    );
    await saveCloudSnapshot(
      "user-a",
      JSON.stringify(backup),
      1,
      row.generation,
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      expectedRevision: 1,
      expectedGeneration: row.generation,
      snapshot: backup,
    });
  });
  it("não reenvia automaticamente depois de conflito", async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 409 }));
    await expect(
      saveCloudSnapshot("user-a", JSON.stringify(backup), 1, row.generation),
    ).rejects.toBeInstanceOf(CloudConflictError);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("valida antes de enviar e mantém exclusão condicionada à revisão", async () => {
    await expect(saveCloudSnapshot("user-a", "{}", 0)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(Response.json({ snapshot: null }));
    await deleteCloudSnapshot("user-a", 2, row.generation);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      expectedRevision: 2,
      expectedGeneration: row.generation,
    });
  });
  it("ignora horário de exportação mas identifica alterações locais", () => {
    const original = JSON.stringify(backup);
    expect(
      backupContentSignature(
        JSON.stringify({ ...backup, exportedAt: "2026-10-25T13:00:00Z" }),
      ),
    ).toBe(backupContentSignature(original));
    expect(
      backupContentSignature(
        JSON.stringify({
          ...backup,
          settings: { ...backup.settings, city: "Rio Verde" },
        }),
      ),
    ).not.toBe(backupContentSignature(original));
  });
});
