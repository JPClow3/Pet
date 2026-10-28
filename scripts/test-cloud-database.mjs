import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import env from "@next/env";
import { neon } from "@neondatabase/serverless";

env.loadEnvConfig(process.cwd());
const suites = {
  "--public-cards": {
    name: "managed public cards",
    file: "managed_public_cards.sql",
  },
  "--account-ownership": {
    name: "account ownership",
    file: "account_ownership.sql",
  },
  "--push": { name: "push application", file: "push_application.sql" },
  "--push-dispatcher": { name: "push dispatcher", file: "push_dispatcher.sql" },
};
const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => !Object.hasOwn(suites, arg)))
  throw new Error("Choose one supported database suite");
const selected = args[0];
const suite = suites[selected] ?? {
  name: "cloud snapshots",
  file: "cloud_snapshots.sql",
};
const pushDispatcher = selected === "--push-dispatcher";
const pushApplication = selected === "--push";
const publicCards = selected === "--public-cards";
const accountOwnership = selected === "--account-ownership";
const variable = pushDispatcher ? "PUSH_DATABASE_URL" : "DATABASE_URL";
if (!process.env[variable]) throw new Error(`${variable} is required`);
const sql = neon(process.env[variable]);
const [login] = await sql.query(
  "select current_user, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, exists(select 1 from pg_roles r where r.rolname='pethub_app' and pg_has_role(current_user,r.oid,'MEMBER')) as app_member, exists(select 1 from pg_roles r where r.rolname='pethub_push_dispatcher' and pg_has_role(current_user,r.oid,'MEMBER')) as dispatcher_member from pg_roles where rolname=current_user",
);
if (
  login.rolsuper ||
  login.rolbypassrls ||
  login.rolcreaterole ||
  login.rolcreatedb
)
  throw new Error("Use a restricted runtime login for this check");
if (pushDispatcher && (login.app_member || !login.dispatcher_member))
  throw new Error("Dispatcher login must have only dispatcher membership");
if (pushApplication && (login.dispatcher_member || !login.app_member))
  throw new Error("Application login must not have dispatcher membership");
const source = await readFile(
  fileURLToPath(new URL(`../db/tests/${suite.file}`, import.meta.url)),
  "utf8",
);
// Statements in this fixture begin at column zero; DO-block bodies are indented.
const statements = source
  .split(/(?=^(?:begin;|select |set local |do |update |rollback;))/m)
  .map((statement) => statement.trim())
  .filter(
    (statement) => statement && !["begin;", "rollback;"].includes(statement),
  );
const marker = "pethub_assertions_passed_rollback";
try {
  await sql.transaction([
    ...statements.map((statement) => sql.query(statement)),
    // Force rollback through the HTTP driver's transaction even after assertions pass.
    sql.query(`do $$ begin raise exception '${marker}'; end $$;`),
  ]);
  throw new Error("Expected a rolled-back transaction");
} catch (error) {
  if (!(error instanceof Error) || error.message !== marker) throw error;
}
console.log(
  JSON.stringify({
    login: login.current_user,
    suite: suite.name,
    restricted: true,
    rlsAndCompareAndSwap:
      accountOwnership || pushDispatcher ? undefined : "passed",
    accountOwnership: pushDispatcher
      ? undefined
      : accountOwnership
        ? "deferred foreign keys and isolated cascade passed"
        : "missing managed identity rejected",
    managedIdentityDeletion: "not exercised; no managed auth rows changed",
    backupFormats:
      publicCards || accountOwnership || pushApplication || pushDispatcher
        ? undefined
        : "v1 and v2 accepted; v3 and over 20 MiB rejected",
    dispatcherBoundary: pushDispatcher
      ? "least privilege and nonexistent lease guards passed; no existing jobs claimed"
      : undefined,
    notificationsSent: pushApplication || pushDispatcher ? 0 : undefined,
    fixtureChanges: "rolled back",
  }),
);
