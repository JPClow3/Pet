import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

// Disposable local Postgres. No application credentials or managed users are used.
const container = `pet-collaboration-test-${randomUUID().slice(0, 8)}`;
const run = (args, input) =>
  new Promise((resolve, reject) => {
    const process = spawn("docker", args, { windowsHide: true });
    let stdout = "",
      stderr = "";
    process.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    process.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    process.on("error", reject);
    process.on("exit", (code) =>
      code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr || stdout)),
    );
    process.stdin.end(input);
  });
const sql = (source) =>
  run(
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-Atq",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    source,
  );
const owner = "00000000-0000-4000-8000-000000000001";
let started = false;
try {
  await run([
    "run",
    "--detach",
    "--rm",
    "--name",
    container,
    "-e",
    "POSTGRES_PASSWORD=local-fixture-only",
    "postgres:17-alpine",
  ]);
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await run(["exec", container, "pg_isready", "-U", "postgres"]);
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  assert(ready, "local Postgres became ready");
  await sql(
    `create schema neon_auth; create table neon_auth."user"(id uuid primary key); insert into neon_auth."user" values ('${owner}');`,
  );
  const migrations = (
    await readdir(new URL("../db/migrations/", import.meta.url))
  )
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    if (file.startsWith("008_")) {
      await sql(`insert into pethub.shared_care_events(pet_id,owner_user_id,actor_name,actor_role,event_type,event_key,status,occurred_at) values
        ('duplicate-fixture','${owner}','First caregiver','cuidador','medication_dose','sched:2026-10-28:08:00','given','2026-10-28T11:00Z'),
        ('duplicate-fixture','${owner}','Retried request','cuidador','medication_dose','sched:2026-10-28T08:00','given','2026-10-28T11:01Z');`);
    }
    await sql(
      await readFile(
        new URL(`../db/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  }
  assert.equal(
    await sql("select count(*) from pethub.shared_care_event_duplicates"),
    "1",
  );
  assert.equal(
    await sql(
      "select actor_name from pethub.shared_care_events where pet_id='duplicate-fixture'",
    ),
    "First caregiver",
  );
  assert.equal(
    await sql(
      "select has_table_privilege('pethub_app','pethub.shared_care_event_duplicates','select')",
    ),
    "f",
  );
  await sql(
    await readFile(
      new URL("../db/tests/collaboration_and_sitter.sql", import.meta.url),
      "utf8",
    ),
  );
  await sql(`insert into pethub.pet_sitter_passes(owner_user_id,pet_id,token_hash,pin_hash,pass_data,expires_at)
    values ('${owner}','race-fixture',repeat('c',64),repeat('d',64),'{}',now()+interval '1 day');`);
  const reserve = `begin; set local role pethub_card_reader;
    select set_config('app.sitter_pass_hash',repeat('c',64),true);
    with reserved as (update pethub.pet_sitter_passes set
      pin_attempt_count=case when pin_window_started_at<=now()-interval '15 minutes' then 1 else pin_attempt_count+1 end,
      pin_window_started_at=case when pin_window_started_at<=now()-interval '15 minutes' then now() else pin_window_started_at end
      where token_hash=repeat('c',64) and (pin_attempt_count<5 or pin_window_started_at<=now()-interval '15 minutes') returning id)
    select count(*) from reserved; commit;`;
  const attempts = await Promise.all(
    Array.from({ length: 20 }, () => sql(reserve)),
  );
  assert.equal(
    attempts.reduce(
      (sum, output) => sum + Number(output.split("\n").at(-1)),
      0,
    ),
    5,
    "concurrent workers share a five-attempt budget",
  );
  await sql(
    "update pethub.pet_sitter_passes set pin_window_started_at=now()-interval '16 minutes' where pet_id='race-fixture'",
  );
  assert.equal(
    (await sql(reserve)).split("\n").at(-1),
    "1",
    "attempt budget reopens after cooldown",
  );
  await sql(
    "update pethub.pet_sitter_passes set pin_hash=null where pet_id='race-fixture'",
  );
  const insert = `begin; set local role pethub_card_reader; select set_config('app.sitter_pass_hash',repeat('c',64),true);
    insert into pethub.shared_care_events(pet_id,owner_user_id,actor_name,actor_role,event_type,event_key,status)
    values('race-fixture','${owner}','Caregiver','cuidador','meal','meal:feed:2026-10-28','served')
    on conflict(owner_user_id,pet_id,event_key) do nothing; commit;`;
  await Promise.all(Array.from({ length: 20 }, () => sql(insert)));
  assert.equal(
    await sql(
      "select count(*) from pethub.shared_care_events where pet_id='race-fixture'",
    ),
    "1",
    "concurrent care retries produce one event",
  );
  console.log(
    "Postgres 17: migrations, duplicate archive, RLS fixture, 20 concurrent PIN attempts, cooldown and 20 concurrent care retries passed.",
  );
} finally {
  if (started) await run(["stop", container]).catch(() => {});
}
