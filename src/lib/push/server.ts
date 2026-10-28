import "server-only";
import { neon } from "@neondatabase/serverless";
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
    publishedAt: new Date(String(row.published_at)).toISOString(),
    validUntil: new Date(String(row.valid_until)).toISOString(),
    lastCode: row.last_code == null ? null : Number(row.last_code),
  };
}
function database() {
  if (!process.env.DATABASE_URL) throw new Error("Push indisponível");
  return neon(process.env.DATABASE_URL, {
    fetchOptions: { cache: "no-store" },
  });
}
export async function readPushDevices(
  userId: string,
  installationId?: string,
): Promise<PushDevice[]> {
  const sql = database();
  const rows = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id',${userId},true)`,
    sql`select installation_id,revision,status,preferences,published_at,valid_until,last_code from pethub.push_devices where user_id=${userId} order by (installation_id=${installationId ?? null}::uuid) desc nulls last, (status='active') desc, created_at desc limit 20`,
  ]);
  return rows[2].map(device);
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
  const sql = database();
  const rows = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id',${userId},true)`,
    sql`select * from pethub.publish_push_agenda(${input.installationId}::uuid,${input.expectedRevision},${JSON.stringify(input.subscription)}::jsonb,${JSON.stringify(input.preferences)}::jsonb,${JSON.stringify(input.agenda)}::jsonb)`,
  ]);
  return rows[2][0] ? device(rows[2][0]) : null;
}
export async function revokePushDevice(
  userId: string,
  installationId: string,
): Promise<void> {
  const sql = database();
  await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id',${userId},true)`,
    sql`select pethub.revoke_push_device(${installationId}::uuid)`,
  ]);
}
