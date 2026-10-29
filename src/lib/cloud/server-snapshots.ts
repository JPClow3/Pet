import "server-only";
import { dbIso, setLocalRole, withPethubApi } from "./pethub-postgres";

function snapshotRow(row: Record<string, unknown> | undefined) {
  if (!row) return null;
  if (!(row.updated_at instanceof Date)) return row;
  return { ...row, updated_at: dbIso(row.updated_at) };
}
export async function readServerSnapshot(userId: string) {
  const rows = await withPethubApi(
    "Cloud database not configured",
    async (sql) => {
      await setLocalRole(sql, "pethub_app");
      await sql`select set_config('app.user_id', ${userId}, true)`;
      return await sql`select user_id, snapshot, revision, generation, updated_at from pethub.user_snapshots where user_id = ${userId}`;
    },
  );
  return snapshotRow(rows[0] as Record<string, unknown> | undefined);
}
export async function saveServerSnapshot(
  userId: string,
  snapshot: unknown,
  expectedRevision: number,
  expectedGeneration: string | null,
) {
  const rows = await withPethubApi(
    "Cloud database not configured",
    async (sql) => {
      await setLocalRole(sql, "pethub_app");
      await sql`select set_config('app.user_id', ${userId}, true)`;
      if (expectedRevision === 0)
        return await sql`insert into pethub.user_snapshots (user_id, snapshot) values (${userId}, ${JSON.stringify(snapshot)}::jsonb) on conflict (user_id) do nothing returning user_id, snapshot, revision, generation, updated_at`;
      return await sql`update pethub.user_snapshots set snapshot = ${JSON.stringify(snapshot)}::jsonb where user_id = ${userId} and revision = ${expectedRevision} and generation = ${expectedGeneration}::uuid returning user_id, snapshot, revision, generation, updated_at`;
    },
  );
  return snapshotRow(rows[0] as Record<string, unknown> | undefined);
}
export async function deleteServerSnapshot(
  userId: string,
  expectedRevision: number,
  expectedGeneration: string,
) {
  const rows = await withPethubApi(
    "Cloud database not configured",
    async (sql) => {
      await setLocalRole(sql, "pethub_app");
      await sql`select set_config('app.user_id', ${userId}, true)`;
      return await sql`delete from pethub.user_snapshots where user_id = ${userId} and revision = ${expectedRevision} and generation = ${expectedGeneration}::uuid returning user_id`;
    },
  );
  return rows.length > 0;
}
