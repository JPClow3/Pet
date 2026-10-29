import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  binding: undefined as string | undefined,
  ctx: undefined as { waitUntil: (promise: Promise<unknown>) => void } | undefined,
  throwContext: true,
}));

const clients = vi.hoisted(() => ({
  created: [] as Array<{
    url: string;
    options: { max?: number; prepare?: boolean; fetch_types?: boolean };
    queries: string[];
    values: unknown[][];
    begin: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    release: () => void;
  }>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => {
    if (state.throwContext) throw new Error("no workers context");
    return {
      env: {
        HYPERDRIVE: state.binding
          ? { connectionString: state.binding }
          : undefined,
      },
      ctx: state.ctx,
    };
  },
}));
vi.mock("postgres", () => ({
  default: (url: string, options: (typeof clients.created)[number]["options"]) => {
    const queries: string[] = [];
    const values: unknown[][] = [];
    const begin = vi.fn(
      async (
        run: (
          sql: (strings: TemplateStringsArray, ...params: unknown[]) => Promise<unknown[]>,
        ) => Promise<unknown>,
      ) => {
        const sql = (strings: TemplateStringsArray, ...params: unknown[]) => {
          queries.push(strings.join("$?"));
          values.push(params);
          const query = Promise.resolve([{ id: "row" }]);
          return Object.assign(query, { simple: () => query });
        };
        return run(sql);
      },
    );
    let release = () => {};
    const end = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const client = { url, options, queries, values, begin, end, release: () => release() };
    clients.created.push(client);
    return client;
  },
}));

import { pethubPostgresOptions, withPethubApi } from "./pethub-postgres";
import { readOwnedCard } from "./server-cards";

describe("pethub postgres client", () => {
  beforeEach(() => {
    clients.created.length = 0;
    state.binding = undefined;
    state.ctx = undefined;
    state.throwContext = true;
    process.env.DATABASE_URL = "";
  });

  it("keeps timestamptz values as ISO strings with milliseconds", () => {
    expect(
      pethubPostgresOptions.types.timestamptz.parse(
        "2026-10-29 03:35:00.123456+00",
      ),
    ).toBe("2026-10-29T03:35:00.123Z");
    expect(pethubPostgresOptions.max).toBe(5);
    expect(pethubPostgresOptions.prepare).toBe(true);
    expect(pethubPostgresOptions.fetch_types).toBe(false);
  });

  it("throws the caller message when neither binding nor DATABASE_URL exists", async () => {
    await expect(withPethubApi("Cloud not configured", async () => null)).rejects.toThrow(
      "Cloud not configured",
    );
    expect(clients.created).toHaveLength(0);
  });

  it("falls back to DATABASE_URL outside the Workers binding", async () => {
    process.env.DATABASE_URL = "postgres://pethub_api:secret@db.example/pethub";
    const pending = withPethubApi("Cloud not configured", async (sql) => {
      await sql`select 1`;
      return "ok";
    });
    const blocked = await Promise.race([
      pending.then(() => "done"),
      new Promise((resolve) => setTimeout(() => resolve("blocked"), 30)),
    ]);
    expect(blocked).toBe("blocked");
    const client = clients.created[0];
    expect(client.url).toBe(process.env.DATABASE_URL);
    expect(client.options.max).toBe(5);
    expect(client.queries).toEqual(["select 1"]);
    client.release();
    await expect(pending).resolves.toBe("ok");
  });

  it("prefers the Hyperdrive connection string and closes with waitUntil", async () => {
    process.env.DATABASE_URL = "postgres://pethub_api:secret@direct.example/pethub";
    state.throwContext = false;
    state.binding = "postgres://pethub_api:secret@hyperdrive.local/pethub";
    const waitUntil = vi.fn();
    state.ctx = { waitUntil };
    const pending = withPethubApi("Cloud not configured", async () => "bound");
    await expect(pending).resolves.toBe("bound");
    const client = clients.created[0];
    expect(client.url).toBe(state.binding);
    expect(client.url).not.toContain("direct.example");
    expect(waitUntil).toHaveBeenCalledOnce();
    expect(client.end).toHaveBeenCalledOnce();
    client.release();
    await waitUntil.mock.calls[0][0];
  });

  it("keeps card reads parameterized inside one role-scoped transaction", async () => {
    process.env.DATABASE_URL = "postgres://pethub_api:secret@db.example/pethub";
    const pending = readOwnedCard("user-1", "pet-1");
    const client = clients.created[0];
    await vi.waitFor(() => expect(client.end).toHaveBeenCalled());
    client.release();
    await expect(pending).rejects.toThrow();
    expect(client.begin).toHaveBeenCalledOnce();
    expect(client.queries[0]).toContain("set local role pethub_app");
    expect(client.queries[1]).toContain("set_config");
    expect(client.queries[1]).toContain("true");
    expect(client.queries[2]).toContain("from pethub.public_cards");
    expect(client.queries.join("\n")).not.toContain("user-1");
    expect(client.values[1]).toEqual(["user-1"]);
    expect(client.values[2]).toEqual(["user-1", "pet-1"]);
  });
});
