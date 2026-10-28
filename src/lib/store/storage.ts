import {
  normalizePersistedState,
  persistedStateSchema,
  type PersistedState,
} from "@/lib/domain/backup";
import {
  openDeviceDatabase,
  requestResult,
  transactionDone,
  SNAPSHOT_KEY,
  type StoredSnapshot,
  type StoredMedia,
} from "./device-db";
import {
  bytesDataUrl,
  dataUrlBytes,
  MEDIA_PREFIX,
  prepareMedia,
} from "./media";

export const STORAGE_KEY = "pethub-store";
let recoveryError: Error | null = null;
let durableBaseline: string | null | undefined;
export class StorageConflictError extends Error {
  constructor() {
    super(
      "Os dados deste aparelho mudaram em outra aba. Atualize a Zelupi antes de salvar; suas alterações ainda estão neste formulário.",
    );
    this.name = "StorageConflictError";
  }
}
export function getStorageRecoveryError() {
  return recoveryError;
}
export function clearStorageRecoveryError() {
  recoveryError = null;
  durableBaseline = undefined;
}
function emit(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}
async function mapImages(
  state: PersistedState,
  convert: (image: string | null) => Promise<string | null>,
) {
  return {
    ...state,
    pets: await Promise.all(
      state.pets.map(async (pet) => ({
        ...pet,
        photo: await convert(pet.photo),
      })),
    ),
    records: await Promise.all(
      state.records.map(async (record) => ({
        ...record,
        attachmentData: await convert(record.attachmentData),
      })),
    ),
    diary: await Promise.all(
      state.diary.map(async (entry) => ({
        ...entry,
        photo: await convert(entry.photo),
      })),
    ),
  };
}
async function prepareSnapshot(
  state: PersistedState,
  importedFiles: Record<string, string>,
) {
  const media = new Map<string, StoredMedia>();
  const cache = new Map<string, Promise<string>>();
  const transformed = await mapImages(
    persistedStateSchema.parse(state),
    async (value) => {
      if (!value?.startsWith("data:")) return value;
      let pending = cache.get(value);
      if (!pending) {
        pending = (async () => {
          const { bytes, mimeType } = dataUrlBytes(value);
          if (!/^image\/(jpeg|png|webp|gif)$/.test(mimeType))
            throw new Error("Formato de imagem não suportado.");
          const item = await prepareMedia(bytes, mimeType);
          media.set(item.id, item);
          return MEDIA_PREFIX + item.id;
        })();
        cache.set(value, pending);
      }
      return pending;
    },
  );
  for (const [id, data] of Object.entries(importedFiles)) {
    const { bytes, mimeType } = dataUrlBytes(data);
    const item = await prepareMedia(bytes, mimeType);
    if (item.id !== id)
      throw new Error("A identificação de um arquivo do backup não confere.");
    media.set(id, item);
  }
  return { state: transformed, media };
}
export async function writePersistedState(
  state: PersistedState,
  recovering = false,
  importedFiles: Record<string, string> = {},
  migratedFrom?: string,
  pruneMedia = false,
) {
  if (recoveryError && !recovering) throw recoveryError;
  const expectedBaseline = durableBaseline;
  try {
    const legacy =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    const fingerprint = legacy
      ? (
          await prepareMedia(
            new TextEncoder().encode(legacy),
            "application/json",
          )
        ).id
      : undefined;
    const prepared = await prepareSnapshot(state, importedFiles);
    const imageIds = [
      ...prepared.state.pets.map((pet) => pet.photo),
      ...prepared.state.records.map((record) => record.attachmentData),
      ...prepared.state.diary.map((entry) => entry.photo),
    ]
      .filter((value): value is string => !!value?.startsWith(MEDIA_PREFIX))
      .map((value) => value.slice(MEDIA_PREFIX.length));
    const referencedIds = new Set([
      ...imageIds,
      ...prepared.state.documents.map((document) => document.mediaId),
    ]);
    const db = await openDeviceDatabase();
    const tx = db.transaction(["snapshots", "media"], "readwrite", {
      durability: "strict",
    });
    let failure: Error | null = null;
    const done = transactionDone(tx);
    const snapshots = tx.objectStore("snapshots");
    const media = tx.objectStore("media");
    const token = crypto.randomUUID();
    const existing = snapshots.get(SNAPSHOT_KEY);
    existing.onsuccess = () => {
      const current = existing.result as StoredSnapshot | undefined;
      if (
        !recovering &&
        ((legacy && fingerprint !== (migratedFrom ?? current?.migratedFrom)) ||
          (expectedBaseline === undefined && current) ||
          (expectedBaseline !== undefined &&
            (current?.token ?? null) !== expectedBaseline))
      ) {
        failure = new StorageConflictError();
        tx.abort();
        return;
      }
      for (const item of prepared.media.values()) media.put(item);
      for (const document of prepared.state.documents) {
        const lookup = media.get(document.mediaId);
        lookup.onsuccess = () => {
          const item = lookup.result as StoredMedia | undefined;
          if (
            !item ||
            item.sizeBytes !== document.sizeBytes ||
            item.mimeType !== document.mimeType
          ) {
            failure = new Error(
              "Um documento não foi encontrado. Nada foi alterado.",
            );
            tx.abort();
          }
        };
      }
      for (const id of imageIds) {
        const lookup = media.get(id);
        lookup.onsuccess = () => {
          if (!lookup.result) {
            failure = new Error(
              "Uma imagem não foi encontrada. Nada foi alterado.",
            );
            tx.abort();
          }
        };
      }
      if (pruneMedia) {
        const cursor = media.openKeyCursor();
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (!entry) return;
          if (!referencedIds.has(String(entry.key))) media.delete(entry.key);
          entry.continue();
        };
      }
      snapshots.put(
        {
          version: 2,
          token,
          state: prepared.state,
          migratedFrom: recovering
            ? fingerprint
            : (migratedFrom ?? current?.migratedFrom),
        } satisfies StoredSnapshot,
        SNAPSHOT_KEY,
      );
    };
    try {
      await done;
    } catch (error) {
      throw failure ?? error;
    }
    durableBaseline = token;
    recoveryError = null;
    if (recovering && legacy) {
      try {
        if (window.localStorage.getItem(STORAGE_KEY) === legacy)
          window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* Fingerprint permits the preserved original on next read. */
      }
    }
  } catch (error) {
    if (error instanceof StorageConflictError) {
      emit("pethub-storage-conflict");
      throw error;
    }
    emit("pethub-storage-error");
    throw new Error(
      "Não foi possível salvar neste aparelho. Seus dados anteriores foram preservados. Confira o espaço disponível e tente novamente.",
      { cause: error },
    );
  }
}
export async function readPersistedState(): Promise<PersistedState | null> {
  try {
    const db = await openDeviceDatabase();
    // Snapshot and binary resources must describe the same database revision.
    const read = db.transaction(["snapshots", "media"], "readonly");
    const [stored, files] = await Promise.all([
      requestResult(read.objectStore("snapshots").get(SNAPSHOT_KEY)) as Promise<
        StoredSnapshot | undefined
      >,
      requestResult(read.objectStore("media").getAll()) as Promise<
        StoredMedia[]
      >,
    ]);
    if (stored) {
      if (stored.version !== 2 || typeof stored.token !== "string")
        throw new Error("Versão incompatível.");
      const legacy =
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY)
          : null;
      if (
        legacy &&
        stored.migratedFrom !==
          (
            await prepareMedia(
              new TextEncoder().encode(legacy),
              "application/json",
            )
          ).id
      )
        throw new Error(
          "Outra versão da Zelupi alterou a cópia antiga. Preserve ambas as cópias antes de restaurar.",
        );
      const parsed = persistedStateSchema.parse(stored.state);
      const byId = new Map(files.map((file) => [file.id, file]));
      const hydrated = await mapImages(parsed, async (image) => {
        if (!image?.startsWith(MEDIA_PREFIX)) return image;
        const file = byId.get(image.slice(MEDIA_PREFIX.length));
        if (!file) throw new Error("Imagem ausente.");
        return bytesDataUrl(file.bytes, file.mimeType);
      });
      for (const document of parsed.documents) {
        const file = byId.get(document.mediaId);
        if (
          !file ||
          file.sizeBytes !== document.sizeBytes ||
          file.mimeType !== document.mimeType
        )
          throw new Error("Documento ausente.");
      }
      durableBaseline = stored.token;
      recoveryError = null;
      return normalizePersistedState(hydrated);
    }
    durableBaseline = null;
    const legacy =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (!legacy) {
      recoveryError = null;
      return null;
    }
    const envelope = JSON.parse(legacy);
    if (envelope.version !== 1) throw new Error("Versão antiga incompatível.");
    const migrated = normalizePersistedState(
      persistedStateSchema.parse(envelope.state),
    );
    const fingerprint = (
      await prepareMedia(new TextEncoder().encode(legacy), "application/json")
    ).id;
    try {
      await writePersistedState(migrated, false, {}, fingerprint);
    } catch (error) {
      if (error instanceof StorageConflictError) return readPersistedState();
      throw error;
    }
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === legacy)
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Retain legacy copy if removal is unavailable. */
    }
    return migrated;
  } catch (error) {
    recoveryError = new Error(
      "Não foi possível abrir os dados deste aparelho. A cópia original foi preservada.",
      { cause: error },
    );
    throw recoveryError;
  }
}
export async function exportOriginalDeviceData(): Promise<string> {
  let db: IDBDatabase;
  try {
    db = await openDeviceDatabase();
  } catch (error) {
    const legacy =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (legacy) return legacy;
    throw error;
  }
  const tx = db.transaction(["snapshots", "media"], "readonly");
  const [snapshot, media] = await Promise.all([
    requestResult(tx.objectStore("snapshots").get(SNAPSHOT_KEY)),
    requestResult(tx.objectStore("media").getAll()) as Promise<StoredMedia[]>,
  ]);
  if (!snapshot && typeof window !== "undefined")
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  return JSON.stringify(
    {
      format: "pethub-recovery",
      snapshot,
      legacy:
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY)
          : null,
      files: Object.fromEntries(
        media.map((item) => [item.id, bytesDataUrl(item.bytes, item.mimeType)]),
      ),
    },
    null,
    2,
  );
}
export const validatedStorage = {
  getItem: async () => {
    const state = await readPersistedState();
    return state ? { state, version: 1 } : null;
  },
  setItem: () => undefined,
  removeItem: async () => {
    throw new Error(
      "Use a exclusão confirmada do perfil para apagar dados locais.",
    );
  },
};
