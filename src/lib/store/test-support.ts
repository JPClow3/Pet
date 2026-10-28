import { vi } from "vitest";
import {
  openDeviceDatabase,
  requestResult,
  SNAPSHOT_KEY,
  transactionDone,
  type StoredSnapshot,
} from "./device-db";

/** Abort a real IndexedDB transaction after its snapshot put request succeeds. */
export function abortNextSnapshotWrite() {
  const original = IDBObjectStore.prototype.put;
  const spy = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      const request = original.apply(this, args);
      if (this.name === "snapshots") {
        spy.mockRestore();
        request.addEventListener("success", () => this.transaction.abort());
      }
      return request;
    });
  return spy;
}

export async function storedSnapshot() {
  const db = await openDeviceDatabase();
  return requestResult(
    db
      .transaction("snapshots", "readonly")
      .objectStore("snapshots")
      .get(SNAPSHOT_KEY),
  ) as Promise<StoredSnapshot | undefined>;
}

/** Simulate a separate tab without advancing this module's optimistic token. */
export async function replaceStoredSnapshot(
  snapshot: StoredSnapshot | undefined,
) {
  const db = await openDeviceDatabase();
  const tx = db.transaction("snapshots", "readwrite");
  const done = transactionDone(tx);
  if (snapshot) tx.objectStore("snapshots").put(snapshot, SNAPSHOT_KEY);
  else tx.objectStore("snapshots").delete(SNAPSHOT_KEY);
  await done;
}

export async function mediaCount() {
  const db = await openDeviceDatabase();
  return requestResult(
    db.transaction("media", "readonly").objectStore("media").count(),
  );
}
