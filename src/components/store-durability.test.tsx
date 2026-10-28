import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/lib/store/app-store";
import { todayKey } from "@/lib/domain/dates";
import {
  abortNextSnapshotWrite,
  mediaCount,
  storedSnapshot,
} from "@/lib/store/test-support";

describe("gravação transacional das ações", () => {
  beforeEach(async () => {
    localStorage.clear();
    await useAppStore.setState(useAppStore.getInitialState(), true);
  });
  afterEach(() => vi.restoreAllMocks());

  it("não interrompe navegação quando apenas analytics falha", async () => {
    const before = useAppStore.getState().events;
    abortNextSnapshotWrite();
    await expect(
      useAppStore.getState().track("onboarding_started"),
    ).resolves.toBeUndefined();
    expect(useAppStore.getState().events).toBe(before);
  });

  it("só publica o estado depois da confirmação e serializa comandos", async () => {
    const pending = useAppStore
      .getState()
      .addPet({ name: "Luna", species: "cao", sex: "femea" });
    expect(useAppStore.getState().pets).toHaveLength(0);
    const petId = await pending;
    await Promise.all([
      useAppStore.getState().updatePet(petId, { name: "Lua" }),
      useAppStore.getState().updatePet(petId, { color: "Preta" }),
    ]);
    expect(useAppStore.getState().pets[0]).toMatchObject({
      name: "Lua",
      color: "Preta",
    });
    expect((await storedSnapshot())?.state).toMatchObject({
      pets: [{ name: "Lua", color: "Preta" }],
    });
  });

  it("mantém conteúdo e analytics intactos quando a transação falha", async () => {
    const petId = await useAppStore
      .getState()
      .addPet({ name: "Luna", species: "cao", sex: "femea" });
    const before = useAppStore.getState();
    const durable = await storedSnapshot();
    abortNextSnapshotWrite();
    const input = {
      petId,
      date: todayKey(),
      text: "Passeio",
      weightKg: null,
      photo: null,
      tags: [],
      place: null,
      visibility: "privado" as const,
    };
    await expect(useAppStore.getState().addDiaryEntry(input)).rejects.toThrow(
      /Não foi possível salvar/,
    );
    expect(useAppStore.getState().diary).toBe(before.diary);
    expect(useAppStore.getState().events).toBe(before.events);
    expect(await storedSnapshot()).toEqual(durable);
    await useAppStore.getState().addDiaryEntry(input);
    expect(useAppStore.getState().diary).toHaveLength(1);
    expect(useAppStore.getState().events[0].name).toBe("diary_entry_created");
  });

  it("falha de documento não deixa metadados nem bytes privados", async () => {
    const petId = await useAppStore
      .getState()
      .addPet({ name: "Luna", species: "cao", sex: "femea" });
    abortNextSnapshotWrite();
    const file = new Blob(["%PDF-1.7\nprivate document"], {
      type: "application/pdf",
    });
    const details = {
      petId,
      title: "Exame",
      category: "exame" as const,
      date: null,
      notes: null,
      fileName: "exame.pdf",
    };
    await expect(
      useAppStore.getState().createDocument(details, file),
    ).rejects.toThrow();
    expect(useAppStore.getState().documents).toHaveLength(0);
    expect(await mediaCount()).toBe(0);
    await useAppStore.getState().createDocument(details, file);
    expect(useAppStore.getState().documents).toHaveLength(1);
    expect(await mediaCount()).toBe(1);
  });
});
