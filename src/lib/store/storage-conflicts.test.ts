import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistedStateSchema } from "@/lib/domain/backup";
import {
  deviceContentSignature,
  exportSnapshot,
  restoreSnapshot,
  useAppStore,
} from "./app-store";
import {
  clearStorageRecoveryError,
  getStorageRecoveryError,
  readPersistedState,
  StorageConflictError,
  writePersistedState,
} from "./storage";
import {
  abortNextSnapshotWrite,
  replaceStoredSnapshot,
  storedSnapshot,
} from "./test-support";

function snapshot() {
  return persistedStateSchema.parse(useAppStore.getInitialState());
}
beforeEach(async () => {
  await useAppStore.setState(useAppStore.getInitialState(), true);
});
afterEach(() => {
  vi.restoreAllMocks();
  clearStorageRecoveryError();
});

describe("conflitos entre abas", () => {
  it("restauração não atropela um comando local já enfileirado após a revisão", async () => {
    const backup = await exportSnapshot();
    const reviewed = deviceContentSignature();
    const edit = useAppStore
      .getState()
      .updateSettings({ city: "Edição depois da revisão" });
    const restore = restoreSnapshot(backup, { expectedLocalState: reviewed });
    await edit;
    await expect(restore).rejects.toThrow(/mudaram durante a revisão/);
    expect((await readPersistedState())?.settings.city).toBe(
      "Edição depois da revisão",
    );
  });
  it("não restaura por cima de outra aba durante a revisão", async () => {
    const chosen = await exportSnapshot();
    const before = useAppStore.getState();
    const newer = {
      ...snapshot(),
      settings: { ...snapshot().settings, city: "Outra aba" },
    };
    await replaceStoredSnapshot({
      version: 2,
      token: crypto.randomUUID(),
      state: newer,
    });
    await expect(restoreSnapshot(chosen)).rejects.toThrow(StorageConflictError);
    expect((await storedSnapshot())?.state).toEqual(newer);
    expect(useAppStore.getState().settings).toBe(before.settings);
  });

  it("recuperação explícita substitui dados corrompidos e continua legível", async () => {
    const backup = await exportSnapshot();
    await replaceStoredSnapshot({ version: 2, token: "broken", state: {} });
    await expect(readPersistedState()).rejects.toThrow();
    await expect(restoreSnapshot(backup)).rejects.toThrow();
    await restoreSnapshot(backup, { recovering: true });
    expect(getStorageRecoveryError()).toBeNull();
    expect((await readPersistedState())?.settings).toEqual(
      useAppStore.getState().settings,
    );
  });

  it("recusa edição antiga e detecta exclusão em outra aba", async () => {
    const original = await storedSnapshot();
    await replaceStoredSnapshot(undefined);
    await expect(
      useAppStore.getState().updateSettings({ city: "São Paulo" }),
    ).rejects.toThrow(StorageConflictError);
    expect(await storedSnapshot()).toBeUndefined();
    expect(useAppStore.getState().settings).toEqual(
      (original?.state as ReturnType<typeof snapshot>).settings,
    );
  });

  it("permite gravar após leitura explícita da versão mais recente", async () => {
    const other = {
      ...snapshot(),
      settings: { ...snapshot().settings, city: "Curitiba" },
    };
    await replaceStoredSnapshot({
      version: 2,
      token: crypto.randomUUID(),
      state: other,
    });
    const refreshed = (await readPersistedState())!;
    refreshed.settings.reminderLeadDays = 7;
    await writePersistedState(refreshed);
    expect((await readPersistedState())?.settings).toMatchObject({
      city: "Curitiba",
      reminderLeadDays: 7,
    });
  });

  it("exige hidratação antes de sobrescrever uma cópia existente", async () => {
    clearStorageRecoveryError();
    await expect(writePersistedState(snapshot())).rejects.toThrow(
      StorageConflictError,
    );
    await replaceStoredSnapshot(undefined);
    await writePersistedState(snapshot());
    expect(await storedSnapshot()).toBeDefined();
  });

  it("transação abortada preserva a base e permite tentar novamente", async () => {
    const before = await storedSnapshot();
    abortNextSnapshotWrite();
    await expect(writePersistedState(snapshot())).rejects.toThrow(
      /Não foi possível salvar/,
    );
    expect(await storedSnapshot()).toEqual(before);
    await writePersistedState(snapshot());
    expect((await storedSnapshot())?.token).not.toBe(before?.token);
  });

  it("duas gravações concorrentes não perdem a atualização vencedora", async () => {
    const first = {
      ...snapshot(),
      settings: { ...snapshot().settings, city: "Primeira" },
    };
    const second = {
      ...snapshot(),
      settings: { ...snapshot().settings, city: "Segunda" },
    };
    const outcomes = await Promise.allSettled([
      writePersistedState(first),
      writePersistedState(second),
    ]);
    expect(
      outcomes.filter((outcome) => outcome.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.status === "rejected"),
    ).toHaveLength(1);
    expect(["Primeira", "Segunda"]).toContain(
      (await readPersistedState())?.settings.city,
    );
  });
});
