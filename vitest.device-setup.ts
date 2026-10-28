import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";
import { beforeEach, vi } from "vitest";
import { closeDeviceDatabase, DEVICE_DB_NAME } from "./src/lib/store/device-db";
import { clearStorageRecoveryError } from "./src/lib/store/storage";

beforeEach(async () => {
  vi.stubGlobal("crypto", webcrypto);
  await closeDeviceDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DEVICE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Test left an active database handle"));
  });
  clearStorageRecoveryError();
});
