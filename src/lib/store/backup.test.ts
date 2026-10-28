import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseBackup } from "@/lib/domain/backup";
import { seedReviews } from "@/lib/domain/seed";
import {
  exportSnapshot,
  resetLocalDataForRecovery,
  restoreSnapshot,
  seedIfNeeded,
  useAppStore,
} from "./app-store";
import {
  clearStorageRecoveryError,
  readPersistedState,
  STORAGE_KEY,
} from "./storage";
import {
  abortNextSnapshotWrite,
  mediaCount,
  replaceStoredSnapshot,
  storedSnapshot,
} from "./test-support";
import { mediaDataUrl } from "./media";

let legacy: Map<string, string>;
beforeEach(async () => {
  legacy = new Map();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => legacy.get(key) ?? null,
      removeItem: (key: string) => legacy.delete(key),
    },
    dispatchEvent: vi.fn(),
  });
  await useAppStore.setState(useAppStore.getInitialState(), true);
  await useAppStore.getState().completeOnboarding({
    tutorName: "Ana",
    email: null,
    city: "São Paulo",
    focusAreas: [],
    pet: { name: "Lua", species: "gato", sex: "femea" },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  clearStorageRecoveryError();
});

describe("backups e recuperação", () => {
  it("remove fotos descartadas sem apagar o mesmo arquivo usado por outro pet", async () => {
    const first = useAppStore.getState().pets[0].id;
    const photo = "data:image/png;base64,iVBORw0KGgo=";
    await useAppStore.getState().updatePet(first, { photo });
    const second = await useAppStore
      .getState()
      .addPet({ name: "Sol", species: "gato", sex: "macho", photo });
    expect(await mediaCount()).toBe(1);
    await useAppStore.getState().updatePet(first, { photo: null });
    expect(await mediaCount()).toBe(1);
    abortNextSnapshotWrite();
    await expect(
      useAppStore.getState().updatePet(second, { photo: null }),
    ).rejects.toThrow();
    expect(await mediaCount()).toBe(1);
    expect(
      (await readPersistedState())?.pets.find((pet) => pet.id === second)
        ?.photo,
    ).toBe(photo);
    await useAppStore.getState().updatePet(second, { photo: null });
    expect(await mediaCount()).toBe(0);
  });
  it("preserva dados restaurados sem duplicar exemplos", async () => {
    const review = { ...seedReviews[0], id: "own-review" };
    await useAppStore.setState({ reviews: [review], seededAt: null });
    await restoreSnapshot(await exportSnapshot());
    await seedIfNeeded();
    await seedIfNeeded();
    expect(useAppStore.getState().reviews).toContainEqual(review);
    expect(
      useAppStore
        .getState()
        .reviews.filter((entry) => entry.id === seedReviews[0].id),
    ).toHaveLength(1);
  });

  it("restaura documentos, lixeira e fotos após apagar os arquivos locais", async () => {
    const petId = useAppStore.getState().pets[0].id;
    const image = "data:image/png;base64,iVBORw0KGgo=";
    await useAppStore.getState().updatePet(petId, { photo: image });
    const file = new Blob(["%PDF-1.7\nprivate document"], {
      type: "application/pdf",
    });
    const id = await useAppStore.getState().createDocument(
      {
        petId,
        title: "Receita",
        category: "receita",
        date: null,
        notes: "Preservar",
        fileName: "receita.pdf",
      },
      file,
    );
    await useAppStore.getState().trashDocument(id);
    const original = useAppStore.getState().documents[0];
    const backup = await exportSnapshot();
    expect(parseBackup(backup).version).toBe(2);
    await useAppStore.getState().resetAll();
    expect(await mediaCount()).toBe(0);
    await restoreSnapshot(backup);
    await restoreSnapshot(backup);
    expect(useAppStore.getState().documents).toEqual([original]);
    expect(await mediaCount()).toBe(2);
    expect(await mediaDataUrl(original.mediaId)).toMatch(
      /^data:application\/pdf;base64,/,
    );
    expect((await readPersistedState())?.pets[0].photo).toBe(image);
    await useAppStore.getState().removePet(petId);
    expect(await mediaCount()).toBe(0);
  });

  it("recupera exportações sem versão e v1", async () => {
    const { tutor, pets, records, reminders, diary, settings } =
      useAppStore.getState();
    const legacyBackup = parseBackup(
      JSON.stringify({
        exportedAt: new Date().toISOString(),
        tutor,
        pets,
        records,
        reminders,
        diary,
        reviews: [seedReviews[0]],
        posts: [],
        settings,
      }),
    );
    expect(legacyBackup.activePetId).toBe(pets[0].id);
    expect(legacyBackup.documents).toEqual([]);
    expect(
      legacyBackup.reviews.filter((review) => review.id === seedReviews[0].id),
    ).toHaveLength(1);
    const v1 = JSON.parse(await exportSnapshot());
    v1.version = 1;
    delete v1.files;
    delete v1.documents;
    await restoreSnapshot(JSON.stringify(v1));
    expect(useAppStore.getState().pets[0].name).toBe("Lua");
  });

  it.each([
    "json",
    "version",
    "duplicate",
    "orphan",
    "date",
    "local-photo",
    "blob-photo",
  ])("rejeita %s sem substituir a cópia atual", async (invalid) => {
    const before = await exportSnapshot();
    const value = JSON.parse(before);
    if (invalid === "version") value.version = 100;
    if (invalid === "duplicate") value.pets.push(value.pets[0]);
    if (invalid === "orphan") value.activePetId = "missing";
    if (invalid === "date") value.pets[0].birthDate = "2026-02-31";
    if (invalid === "local-photo") value.pets[0].photo = "pethub-media:missing";
    if (invalid === "blob-photo")
      value.pets[0].photo = "blob:https://example.com/missing";
    await expect(
      restoreSnapshot(invalid === "json" ? "{" : JSON.stringify(value)),
    ).rejects.toThrow();
    expect(useAppStore.getState().pets).toEqual(JSON.parse(before).pets);
  });

  it("transação abortada restaura nem estado nem arquivos", async () => {
    const original = await storedSnapshot();
    const changed = JSON.parse(await exportSnapshot());
    changed.pets[0].name = "Outra";
    changed.pets[0].photo = "data:image/png;base64,iVBORw0KGgo=";
    abortNextSnapshotWrite();
    await expect(
      restoreSnapshot(JSON.stringify(changed), { recovering: true }),
    ).rejects.toThrow(/Não foi possível salvar/);
    expect(useAppStore.getState().pets[0].name).toBe("Lua");
    expect(await storedSnapshot()).toEqual(original);
    expect(await mediaCount()).toBe(0);
  });

  it("migra armazenamento antigo com fotos apenas após commit e detecta aba antiga", async () => {
    const backup = parseBackup(await exportSnapshot());
    backup.pets[0].photo = "data:image/png;base64,iVBORw0KGgo=";
    const raw = JSON.stringify({ state: backup, version: 1 });
    await replaceStoredSnapshot(undefined);
    clearStorageRecoveryError();
    legacy.set(STORAGE_KEY, raw);
    abortNextSnapshotWrite();
    await expect(readPersistedState()).rejects.toThrow();
    expect(legacy.get(STORAGE_KEY)).toBe(raw);
    expect(await storedSnapshot()).toBeUndefined();
    clearStorageRecoveryError();
    expect((await readPersistedState())?.pets[0].photo).toBe(
      backup.pets[0].photo,
    );
    expect(legacy.has(STORAGE_KEY)).toBe(false);
    expect(JSON.stringify((await storedSnapshot())?.state)).toContain(
      "pethub-media:",
    );
    legacy.set(STORAGE_KEY, raw.replace("Lua", "Outra aba antiga"));
    await expect(readPersistedState()).rejects.toThrow(
      /original foi preservada/,
    );
  });

  it("recuperação explícita resolve também o legado corrompido", async () => {
    const original = "{broken";
    legacy.set(STORAGE_KEY, original);
    await expect(readPersistedState()).rejects.toThrow();
    await expect(
      useAppStore.getState().updateTutor({ name: "Outra" }),
    ).rejects.toThrow();
    expect(legacy.get(STORAGE_KEY)).toBe(original);
    await resetLocalDataForRecovery();
    expect(legacy.has(STORAGE_KEY)).toBe(false);
    expect((await readPersistedState())?.pets).toEqual([]);
  });
});
