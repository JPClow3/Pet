import { z } from "zod";
import { isSameOriginRequest } from "@/lib/http/same-origin";
import { MAX_CLOUD_BACKUP_BYTES, parseBackup } from "@/lib/domain/backup";
import { applyBackupDelta } from "@/lib/domain/delta-sync";

type Services = {
  currentUser: () => Promise<{ id: string; emailVerified: boolean } | null>;
  read: (userId: string) => Promise<unknown>;
  save: (
    userId: string,
    snapshot: unknown,
    expectedRevision: number,
    expectedGeneration: string | null,
  ) => Promise<unknown>;
  remove: (
    userId: string,
    expectedRevision: number,
    expectedGeneration: string,
  ) => Promise<boolean>;
};
const revision = z.number().int().min(0).max(2_147_483_646);
const payload = z
  .object({
    expectedRevision: revision,
    expectedGeneration: z.uuid().nullable().default(null),
    snapshot: z.unknown().optional(),
    delta: z.unknown().optional(),
  })
  .refine((value) =>
    value.expectedRevision === 0
      ? value.expectedGeneration === null
      : value.expectedGeneration !== null,
  );
const response = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
async function boundedText(request: Request) {
  const limit = MAX_CLOUD_BACKUP_BYTES + 1024;
  if (Number(request.headers.get("content-length")) > limit)
    throw new Error("Too large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Body required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("Too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
export function createSnapshotHandlers(services: Services) {
  async function handle(request: Request) {
    try {
      if (request.method !== "GET" && !isSameOriginRequest(request))
        return response({ error: "Origin not allowed" }, 403);
      const user = await services.currentUser();
      if (!user) return response({ error: "Sign in required" }, 401);
      if (
        !user.emailVerified ||
        request.headers.get("X-PetHub-User") !== user.id
      )
        return response(
          { error: "Session changed or email is not verified" },
          403,
        );
      if (request.method === "GET")
        return response({ snapshot: await services.read(user.id) });
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return response({ error: "JSON required" }, 415);
      let body: z.infer<typeof payload>;
      try {
        body = payload.parse(JSON.parse(await boundedText(request)));
      } catch {
        return response({ error: "Invalid or oversized snapshot" }, 400);
      }
      if (request.method === "DELETE") {
        if (!body.expectedGeneration)
          return response({ error: "Snapshot identity required" }, 400);
        const removed = await services.remove(
          user.id,
          body.expectedRevision,
          body.expectedGeneration,
        );
        return removed
          ? response({ snapshot: null })
          : response({ error: "Revision conflict" }, 409);
      }
      if (request.method === "PATCH") {
        if (
          body.expectedRevision <= 0 ||
          !body.expectedGeneration ||
          body.delta === undefined
        ) {
          return response({ error: "Delta and snapshot identity required" }, 400);
        }
        const currentRaw = (await services.read(user.id)) as {
          revision?: number;
          generation?: string;
          snapshot?: unknown;
        } | null;
        if (
          !currentRaw ||
          currentRaw.revision !== body.expectedRevision ||
          currentRaw.generation !== body.expectedGeneration
        ) {
          return response({ error: "Revision conflict" }, 409);
        }
        let merged;
        try {
          const currentBackup = parseBackup(
            JSON.stringify(currentRaw.snapshot),
          );
          merged = applyBackupDelta(currentBackup, body.delta);
          if (
            new TextEncoder().encode(JSON.stringify(merged)).byteLength >
            MAX_CLOUD_BACKUP_BYTES
          ) {
            return response({ error: "Merged snapshot exceeds cloud limit" }, 400);
          }
        } catch {
          return response({ error: "Invalid delta" }, 400);
        }
        const saved = await services.save(
          user.id,
          merged,
          body.expectedRevision,
          body.expectedGeneration,
        );
        return saved
          ? response({ snapshot: saved })
          : response({ error: "Revision conflict" }, 409);
      }
      let snapshot;
      try {
        snapshot = parseBackup(JSON.stringify(body.snapshot));
      } catch {
        return response({ error: "Invalid backup" }, 400);
      }
      const saved = await services.save(
        user.id,
        snapshot,
        body.expectedRevision,
        body.expectedGeneration,
      );
      return saved
        ? response({ snapshot: saved })
        : response({ error: "Revision conflict" }, 409);
    } catch {
      return response({ error: "Cloud temporarily unavailable" }, 503);
    }
  }
  return { GET: handle, PUT: handle, PATCH: handle, DELETE: handle };
}
