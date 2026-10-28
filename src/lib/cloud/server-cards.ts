import "server-only";
import { neon } from "@neondatabase/serverless";
import {
  managedCardSchema,
  MAX_PUBLIC_CARD_BYTES,
  type ManagedCardMutation,
} from "@/lib/domain/managed-card";
import { publicPetCardSchema } from "@/lib/domain/schema";
import { createCardToken, hashCardToken } from "./card-tokens";

function database() {
  if (!process.env.DATABASE_URL) throw new Error("Cloud not configured");
  return neon(process.env.DATABASE_URL, {
    fetchOptions: { cache: "no-store" },
  });
}
function ownerResult(row: Record<string, unknown> | undefined) {
  if (!row) return null;
  return managedCardSchema.parse({
    id: row.id,
    petId: row.pet_id,
    revision: row.revision,
    tokenVersion: row.token_version,
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    revokedAt: row.revoked_at
      ? new Date(String(row.revoked_at)).toISOString()
      : null,
    card: row.card,
  });
}
export async function readOwnedCard(userId: string, petId: string) {
  const sql = database();
  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${userId}, true)`,
    sql`select id, pet_id, revision, token_version, expires_at, updated_at, revoked_at, card from pethub.public_cards where user_id=${userId} and pet_id=${petId}`,
  ]);
  return ownerResult(result[2][0]);
}
export async function mutateOwnedCard(
  userId: string,
  input: ManagedCardMutation,
) {
  const sql = database();
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
  const mutation =
    input.action === "create"
      ? sql`insert into pethub.public_cards(user_id,pet_id,token_hash,card,expires_at) values(${userId},${input.petId},${hash},${json}::jsonb,${expiry}::timestamptz) on conflict(user_id,pet_id) do nothing returning *`
      : input.action === "refresh"
        ? sql`update pethub.public_cards set card=${json}::jsonb,expires_at=${expiry}::timestamptz where user_id=${userId} and pet_id=${input.petId} and id=${input.id}::uuid and revision=${input.expectedRevision} and revoked_at is null returning *`
        : input.action === "rotate"
          ? sql`update pethub.public_cards set token_hash=${hash},card=${json}::jsonb,expires_at=${expiry}::timestamptz,revoked_at=null where user_id=${userId} and pet_id=${input.petId} and id=${input.id}::uuid and revision=${input.expectedRevision} returning *`
          : sql`update pethub.public_cards set revoked_at=now(),card=null where user_id=${userId} and pet_id=${input.petId} and id=${input.id}::uuid and revision=${input.expectedRevision} returning *`;
  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${userId}, true)`,
    mutation,
  ]);
  const record = ownerResult(result[2][0]);
  return record ? { record, token } : null;
}
export async function readManagedPublicCard(token: string) {
  const hash = await hashCardToken(token);
  const sql = database();
  const result = await sql.transaction([
    sql`set local role pethub_card_reader`,
    sql`select set_config('app.public_card_hash', ${hash}, true)`,
    sql`select card,expires_at,updated_at from pethub.public_cards where token_hash=${hash}`,
  ]);
  const row = result[2][0];
  if (!row) return null;
  return {
    card: publicPetCardSchema.parse(row.card),
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}
