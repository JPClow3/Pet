import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import postgres from "postgres";

const timestamptz = {
  to: 1184,
  from: [1184, 1114],
  serialize: (value: string) => value,
  parse: (value: string) => new Date(value).toISOString(),
};

// Hyperdrive already pools connections to Neon. This cap is the per-request
// client limit from Cloudflare's Workers guidance, not the origin pool size.
export const pethubPostgresOptions = {
  max: 5,
  fetch_types: false,
  prepare: true,
  connect_timeout: 10,
  idle_timeout: 20,
  connection: {
    application_name: "pethub",
  },
  types: {
    timestamptz,
  },
};

type WaitUntil = {
  waitUntil(promise: Promise<unknown>): void;
};

export async function setLocalRole(
  sql: postgres.TransactionSql,
  role: "pethub_app" | "pethub_card_reader",
) {
  // SET is a utility command. Postgres rejects it as a prepared statement, so
  // it uses the simple protocol on the same transaction connection.
  if (role === "pethub_app") await sql`set local role pethub_app`.simple();
  else await sql`set local role pethub_card_reader`.simple();
}

export function dbIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

function workersBinding(): {
  connectionString?: string;
  ctx?: WaitUntil;
} {
  try {
    const context = getCloudflareContext();
    const connectionString = context.env.HYPERDRIVE?.connectionString;
    return {
      connectionString: connectionString || undefined,
      ctx: context.ctx,
    };
  } catch {
    return {};
  }
}

function closeClient(sql: postgres.Sql, ctx?: WaitUntil) {
  const ended = sql.end({ timeout: 5 }).catch((error: unknown) => {
    console.error(
      "database connection close failed",
      error instanceof Error ? error.name : "Error",
    );
  });
  if (ctx) {
    ctx.waitUntil(ended);
    return;
  }
  return ended;
}

export async function withPethubApi<T>(
  missingMessage: string,
  run: (sql: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  const binding = workersBinding();
  const connectionString =
    binding.connectionString || process.env.DATABASE_URL || undefined;
  if (!connectionString) throw new Error(missingMessage);
  const sql = postgres(connectionString, pethubPostgresOptions);
  try {
    return (await sql.begin((transaction) => run(transaction))) as T;
  } finally {
    await closeClient(sql, binding.ctx);
  }
}
