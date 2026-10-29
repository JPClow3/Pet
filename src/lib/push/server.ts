import "server-only";
import { dbIso, setLocalRole, withPethubApi } from "@/lib/cloud/pethub-postgres";
import type {
  PushAgenda,
  PushPreferences,
  PushSubscriptionData,
} from "./schema";

export type PushDevice = {
  installationId: string;
  revision: number;
  status: "active" | "revoked" | "expired";
  preferences: PushPreferences;
  publishedAt: string;
  validUntil: string;
  lastCode: number | null;
};
function device(row: Record<string, unknown>): PushDevice {
  return {
    installationId: String(row.installation_id),
    revision: Number(row.revision),
    status: row.status as PushDevice["status"],
    preferences: row.preferences as PushPreferences,
    publishedAt: dbIso(row.published_at),
    validUntil: dbIso(row.valid_until),
    lastCode: row.last_code == null ? null : Number(row.last_code),
  };
}
export async function readPushDevices(
  userId: string,
  installationId?: string,
): Promise<PushDevice[]> {
  const rows = await withPethubApi("Push indisponível", async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id',${userId},true)`;
    return await sql`select installation_id,revision,status,preferences,published_at,valid_until,last_code from pethub.push_devices where user_id=${userId} order by (installation_id=${installationId ?? null}::uuid) desc nulls last, (status='active') desc, created_at desc limit 20`;
  });
  return rows.map((row) => device(row as Record<string, unknown>));
}
export async function publishPushAgenda(
  userId: string,
  input: {
    installationId: string;
    expectedRevision: number;
    subscription: PushSubscriptionData;
    preferences: PushPreferences;
    agenda: PushAgenda;
  },
): Promise<PushDevice | null> {
  const rows = await withPethubApi("Push indisponível", async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id',${userId},true)`;
    return await sql`select * from pethub.publish_push_agenda(${input.installationId}::uuid,${input.expectedRevision},${JSON.stringify(input.subscription)}::jsonb,${JSON.stringify(input.preferences)}::jsonb,${JSON.stringify(input.agenda)}::jsonb)`;
  });
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? device(row) : null;
}
export async function revokePushDevice(
  userId: string,
  installationId: string,
): Promise<void> {
  await withPethubApi("Push indisponível", async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id',${userId},true)`;
    await sql`select pethub.revoke_push_device(${installationId}::uuid)`;
  });
}
