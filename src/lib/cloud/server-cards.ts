import "server-only";
import {
  managedCardSchema,
  MAX_PUBLIC_CARD_BYTES,
  type ManagedCardMutation,
} from "@/lib/domain/managed-card";
import { publicPetCardSchema } from "@/lib/domain/schema";
import { createCardToken, hashCardToken } from "./card-tokens";
import { dbIso, setLocalRole, withPethubApi } from "./pethub-postgres";

function ownerResult(row: Record<string, unknown> | undefined) {
  if (!row) return null;
  return managedCardSchema.parse({
    id: row.id,
    petId: row.pet_id,
    revision: row.revision,
    tokenVersion: row.token_version,
    expiresAt: dbIso(row.expires_at),
    updatedAt: dbIso(row.updated_at),
    revokedAt: row.revoked_at ? dbIso(row.revoked_at) : null,
    card: row.card,
  });
}
export async function readOwnedCard(userId: string, petId: string) {
  const rows = await withPethubApi("Cloud not configured", async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id', ${userId}, true)`;
    return await sql`select id, pet_id, revision, token_version, expires_at, updated_at, revoked_at, card from pethub.public_cards where user_id=${userId} and pet_id=${petId}`;
  });
  return ownerResult(rows[0] as Record<string, unknown> | undefined);
}
export async function mutateOwnedCard(
  userId: string,
  input: ManagedCardMutation,
) {
  const now = new Date();
  const token =
    input.action === "create" || input.action === "rotate"
      ? createCardToken()
      : null;
  const hash = token ? await hashCardToken(token) : null;
  const card =
    input.action === "revoke"
      ? null
      : publicPetCardSchema.parse({
          ...input.card,
          generatedAt: now.toISOString(),
        });
  const json = JSON.stringify(card);
  if (new TextEncoder().encode(json).byteLength > MAX_PUBLIC_CARD_BYTES)
    throw new Error("Card too large");
  const expiry =
    input.action === "revoke"
      ? null
      : new Date(now.getTime() + input.expiresInDays * 86400000).toISOString();
  const rows = await withPethubApi("Cloud not configured", async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id', ${userId}, true)`;
    if (input.action === "create")
      return await sql`insert into pethub.public_cards(user_id,pet_id,token_hash,card,expires_at) values(${userId},${input.petId},${hash},${json}::jsonb,${expiry}::timestamptz) on conflict(user_id,pet_id) do nothing returning *`;
    if (input.action === "refresh")
      return await sql`update pethub.public_cards set card=${json}::jsonb,expires_at=${expiry}::timestamptz where user_id=${userId} and pet_id=${input.petId} and id=${input.id}::uuid and revision=${input.expectedRevision} and revoked_at is null returning *`;
    if (input.action === "rotate")
      return await sql`update pethub.public_cards set token_hash=${hash},card=${json}::jsonb,expires_at=${expiry}::timestamptz,revoked_at=null where user_id=${userId} and pet_id=${input.petId} and id=${input.id}::uuid and revision=${input.expectedRevision} returning *`;
    return await sql`update pethub.public_cards set revoked_at=now(),card=null where user_id=${userId} and pet_id=${input.petId} and id=${input.id}::uuid and revision=${input.expectedRevision} returning *`;
  });
  const record = ownerResult(rows[0] as Record<string, unknown> | undefined);
  return record ? { record, token } : null;
}
export async function readManagedPublicCard(token: string) {
  const hash = await hashCardToken(token);
  const rows = await withPethubApi("Cloud not configured", async (sql) => {
    await setLocalRole(sql, "pethub_card_reader");
    await sql`select set_config('app.public_card_hash', ${hash}, true)`;
    return await sql`select card,expires_at,updated_at from pethub.public_cards where token_hash=${hash}`;
  });
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    card: publicPetCardSchema.parse(row.card),
    expiresAt: dbIso(row.expires_at),
    updatedAt: dbIso(row.updated_at),
  };
}
