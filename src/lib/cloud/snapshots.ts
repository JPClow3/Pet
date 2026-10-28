import { z } from "zod";
import {
  MAX_CLOUD_BACKUP_BYTES,
  parseBackup,
  type Backup,
} from "@/lib/domain/backup";

export type CloudSnapshot = {
  userId: string;
  revision: number;
  generation: string;
  updatedAt: string;
  backup: Backup;
};
export class CloudConflictError extends Error {
  constructor() {
    super(
      "A cópia na nuvem mudou em outro aparelho. Confira a nova versão antes de escolher qual manter.",
    );
    this.name = "CloudConflictError";
  }
}
export function backupContentSignature(text: string): string {
  return JSON.stringify({ ...parseBackup(text), exportedAt: null });
}
const rowSchema = z.object({
  user_id: z.string().min(1).max(200),
  revision: z.number().int().positive().max(2_147_483_647),
  generation: z.uuid(),
  updated_at: z.iso.datetime({ offset: true }),
  snapshot: z.unknown(),
});
export function parseCloudSnapshot(
  raw: unknown,
  expectedUserId: string,
): CloudSnapshot {
  const row = rowSchema.parse(raw);
  if (row.user_id !== expectedUserId)
    throw new Error("Esta cópia pertence a outra conta. Entre novamente.");
  return {
    userId: row.user_id,
    revision: row.revision,
    generation: row.generation,
    updatedAt: row.updated_at,
    backup: parseBackup(JSON.stringify(row.snapshot)),
  };
}
async function cloudRequest(userId: string, init: RequestInit = {}) {
  const response = await fetch("/api/cloud/snapshot", {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-PetHub-User": userId,
      ...init.headers,
    },
  });
  if (response.status === 409) throw new CloudConflictError();
  if (response.status === 401 || response.status === 403)
    throw new Error(
      "Sua sessão mudou, expirou ou precisa confirmar o e-mail. Entre novamente antes de sincronizar.",
    );
  if (!response.ok)
    throw new Error(
      "Não foi possível acessar a nuvem. Confira a conexão. A cópia deste aparelho continua intacta.",
    );
  return response.json() as Promise<{ snapshot: unknown }>;
}
export async function readCloudSnapshot(
  userId: string,
): Promise<CloudSnapshot | null> {
  const { snapshot } = await cloudRequest(userId);
  return snapshot ? parseCloudSnapshot(snapshot, userId) : null;
}
export async function saveCloudSnapshot(
  userId: string,
  snapshot: string,
  expectedRevision: number,
  expectedGeneration: string | null = null,
): Promise<CloudSnapshot> {
  const backup = parseBackup(snapshot);
  if (
    new TextEncoder().encode(JSON.stringify(backup)).byteLength >
    MAX_CLOUD_BACKUP_BYTES
  )
    throw new Error(
      "Esta cópia ultrapassa os 20 MB da nuvem. Baixe o backup completo em arquivo para guardar todos os documentos.",
    );
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
    throw new Error("Consulte a nuvem antes de salvar.");
  const result = await cloudRequest(userId, {
    method: "PUT",
    body: JSON.stringify({
      expectedRevision,
      expectedGeneration,
      snapshot: backup,
    }),
  });
  return parseCloudSnapshot(result.snapshot, userId);
}
export async function deleteCloudSnapshot(
  userId: string,
  revision: number,
  generation: string,
): Promise<void> {
  await cloudRequest(userId, {
    method: "DELETE",
    body: JSON.stringify({
      expectedRevision: revision,
      expectedGeneration: generation,
    }),
  });
}
