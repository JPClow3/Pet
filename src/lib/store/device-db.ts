export const DEVICE_DB_NAME = "pethub-device";
export const DEVICE_DB_VERSION = 1;
export const SNAPSHOT_KEY = "current";

export type StoredMedia = {
  id: string;
  bytes: Uint8Array;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};
export type StoredSnapshot = {
  version: 2;
  token: string;
  migratedFrom?: string;
  state: unknown;
};

let connection: Promise<IDBDatabase> | null = null;
export function openDeviceDatabase(): Promise<IDBDatabase> {
  if (connection) return connection;
  connection = new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false;
    if (typeof indexedDB === "undefined") {
      reject(
        new Error(
          "Este navegador não disponibilizou o armazenamento de dados.",
        ),
      );
      return;
    }
    const request = indexedDB.open(DEVICE_DB_NAME, DEVICE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("snapshots"))
        db.createObjectStore("snapshots");
      if (!db.objectStoreNames.contains("media"))
        db.createObjectStore("media", { keyPath: "id" });
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Não foi possível abrir os dados."));
    request.onblocked = () => {
      blocked = true;
      reject(
        new Error(
          "Feche outras abas da Zelupi para atualizar o armazenamento.",
        ),
      );
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) {
        db.close();
        return;
      }
      db.onversionchange = () => {
        db.close();
        connection = null;
      };
      resolve(db);
    };
  }).catch((error) => {
    connection = null;
    throw error;
  });
  return connection;
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Falha no armazenamento."));
  });
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        transaction.error ??
          new Error("A gravação foi cancelada. Nada foi alterado."),
      );
    transaction.onerror = () => {
      /* onabort reports the final, rolled-back result */
    };
  });
}

// Close handles before deleting an isolated test database or a future schema upgrade.
export async function closeDeviceDatabase() {
  const current = connection;
  connection = null;
  if (current) {
    try {
      (await current).close();
    } catch {
      /* already unavailable */
    }
  }
}
