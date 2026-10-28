import "server-only";
import { neon } from "@neondatabase/serverless";

function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("Cloud database not configured");
  return neon(process.env.DATABASE_URL, {
    fetchOptions: { cache: "no-store" },
  });
}
export async function readServerSnapshot(userId: string) {
  const sql = database();
  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${userId}, true)`,
    sql`select user_id, snapshot, revision, generation, updated_at from pethub.user_snapshots where user_id = ${userId}`,
  ]);
  return result[2][0] ?? null;
}
export async function saveServerSnapshot(
  userId: string,
  snapshot: unknown,
  expectedRevision: number,
  expectedGeneration: string | null,
) {
  const sql = database();
  const mutation =
    expectedRevision === 0
      ? sql`insert into pethub.user_snapshots (user_id, snapshot) values (${userId}, ${JSON.stringify(snapshot)}::jsonb) on conflict (user_id) do nothing returning user_id, snapshot, revision, generation, updated_at`
      : sql`update pethub.user_snapshots set snapshot = ${JSON.stringify(snapshot)}::jsonb where user_id = ${userId} and revision = ${expectedRevision} and generation = ${expectedGeneration}::uuid returning user_id, snapshot, revision, generation, updated_at`;
  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${userId}, true)`,
    mutation,
  ]);
  return result[2][0] ?? null;
}
export async function deleteServerSnapshot(
  userId: string,
  expectedRevision: number,
  expectedGeneration: string,
) {
  const sql = database();
  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${userId}, true)`,
    sql`delete from pethub.user_snapshots where user_id = ${userId} and revision = ${expectedRevision} and generation = ${expectedGeneration}::uuid returning user_id`,
  ]);
  return result[2].length > 0;
}
