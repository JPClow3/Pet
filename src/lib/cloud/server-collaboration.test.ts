import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashSitterPin } from "@/lib/domain/collaboration";

const db = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./pethub-postgres", () => ({
  dbIso: (value: unknown) => new Date(String(value)).toISOString(),
  setLocalRole: async (
    sql: (parts: TemplateStringsArray) => Promise<unknown>,
    role: string,
  ) => {
    await sql(
      Object.assign([`set local role ${role}`], {
        raw: [`set local role ${role}`],
      }),
    );
  },
  withPethubApi: async (
    _message: string,
    run: (sql: unknown) => Promise<unknown>,
  ) => {
    const queries: { text: string; values: unknown[] }[] = [];
    const results = await db.transaction(queries);
    let index = 0;
    return run((parts: TemplateStringsArray, ...values: unknown[]) => {
      queries.push({ text: parts.join("?"), values });
      return Promise.resolve(results[index++] ?? []);
    });
  },
}));
import {
  acceptCollaborationInvite,
  invitePetCollaborator,
  recordSitterCareAction,
  SitterAccessError,
  verifySitterPassPinAndRead,
} from "./server-collaboration";

const token = `s_${"a".repeat(43)}`;
const event = {
  eventType: "meal" as const,
  eventKey: "meal:feed:2026-10-28",
  status: "served" as const,
  actorName: "Caregiver",
};
const pass = (pin_hash: string | null) => ({
  pin_hash,
  pet_id: "pet-a",
  owner_user_id: "owner-a",
  pass_data: { v: 1 },
});
const result = (row?: unknown) => [[], [], row ? [row] : []];
const statements = () =>
  db.transaction.mock.calls.flatMap(([queries]) => queries) as {
    text: string;
    values: unknown[];
  }[];

describe("public sitter authorization", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://fixture.invalid/test");
    db.transaction.mockReset();
  });

  it("rejects care recording without the PIN before inserting an event", async () => {
    db.transaction.mockResolvedValueOnce(result(pass("b".repeat(64))));
    await expect(recordSitterCareAction(token, event)).rejects.toMatchObject({
      status: 401,
    });
    expect(
      statements().some((query) => query.text.includes("insert into")),
    ).toBe(false);
  });

  it("reserves an attempt and rejects a wrong PIN on the write path", async () => {
    const hash = await hashSitterPin("4829");
    db.transaction
      .mockResolvedValueOnce(result(pass(hash)))
      .mockResolvedValueOnce([
        ...result({ id: "pass" }),
        [{ retry_after: 900 }],
      ]);
    await expect(
      recordSitterCareAction(token, { ...event, pin: "1234" }),
    ).rejects.toMatchObject({ status: 401 });
    expect(
      statements().some((query) =>
        query.text.includes("pin_attempt_count < 5"),
      ),
    ).toBe(true);
    expect(
      statements().some((query) => query.text.includes("insert into")),
    ).toBe(false);
  });

  it("shares the persisted lockout across verification and care recording", async () => {
    for (const action of [
      () => verifySitterPassPinAndRead(token, "4829"),
      () => recordSitterCareAction(token, { ...event, pin: "4829" }),
    ]) {
      db.transaction
        .mockResolvedValueOnce(result(pass("b".repeat(64))))
        .mockResolvedValueOnce([...result(), [{ retry_after: 720 }]]);
      await expect(action()).rejects.toMatchObject({
        status: 429,
        retryAfter: 720,
      });
    }
    expect(
      statements().some((query) => query.text.includes("insert into")),
    ).toBe(false);
  });

  it("verifies a correct PIN, resets its budget and supplies the database proof", async () => {
    const hash = await hashSitterPin("4829");
    db.transaction
      .mockResolvedValueOnce(result(pass(hash)))
      .mockResolvedValueOnce([
        ...result({ id: "pass" }),
        [{ retry_after: 900 }],
      ])
      .mockResolvedValueOnce(result())
      .mockResolvedValueOnce([[], [], [], []]);
    await expect(
      recordSitterCareAction(token, { ...event, pin: "4829" }),
    ).resolves.toBe(true);
    expect(statements()).toContainEqual(
      expect.objectContaining({
        text: expect.stringContaining("app.sitter_verified_pin_hash"),
        values: [hash],
      }),
    );
    expect(
      statements().some((query) =>
        query.text.includes(
          "on conflict (owner_user_id, pet_id, event_key) do nothing",
        ),
      ),
    ).toBe(true);
  });

  it("keeps unprotected passes usable and rejects expired or revoked passes", async () => {
    db.transaction
      .mockResolvedValueOnce(result(pass(null)))
      .mockResolvedValueOnce([[], [], [], []]);
    await expect(recordSitterCareAction(token, event)).resolves.toBe(true);
    db.transaction.mockResolvedValueOnce(result());
    await expect(recordSitterCareAction(token, event)).rejects.toBeInstanceOf(
      SitterAccessError,
    );
  });

  it("requires a pet from the owner's cloud snapshot to invite a collaborator", async () => {
    db.transaction.mockResolvedValueOnce(result());
    await expect(
      invitePetCollaborator("owner-a", {
        petId: "foreign-pet",
        petName: "Fake",
        collaboratorEmail: "recipient@example.test",
        collaboratorName: "Recipient",
        role: "co_tutor",
      }),
    ).rejects.toThrow(/cópia da sua conta/);
    expect(
      statements().some((query) =>
        query.text.includes("pethub.user_snapshots"),
      ),
    ).toBe(true);
  });

  it("binds invite acceptance to the authenticated recipient email", async () => {
    db.transaction.mockResolvedValueOnce([[], [], [], []]);
    expect(
      await acceptCollaborationInvite(
        "recipient",
        "Recipient@Example.test",
        "inv_fixture_code",
      ),
    ).toBeNull();
    expect(statements()).toContainEqual(
      expect.objectContaining({
        text: expect.stringContaining("and collaborator_email ="),
        values: expect.arrayContaining(["recipient@example.test"]),
      }),
    );
  });
});
