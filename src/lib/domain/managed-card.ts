import { z } from "zod";
import { publicPetCardSchema } from "./schema";

export const MANAGED_CARD_TOKEN = /^c_[A-Za-z0-9_-]{43}$/;
export const MAX_PUBLIC_CARD_BYTES = 8192;
export const cardExpiryDays = z.union([
  z.literal(7),
  z.literal(30),
  z.literal(90),
]);
export const managedCardSchema = z.object({
  id: z.uuid(),
  petId: z.string().min(1).max(100),
  revision: z.number().int().positive(),
  tokenVersion: z.uuid(),
  expiresAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  revokedAt: z.iso.datetime({ offset: true }).nullable(),
  card: publicPetCardSchema.nullable(),
});
export type ManagedCard = z.infer<typeof managedCardSchema>;
export const managedCardMutation = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      petId: z.string().min(1).max(100),
      consent: z.literal(true),
      expiresInDays: cardExpiryDays,
      card: publicPetCardSchema.strict(),
    })
    .strict(),
  z
    .object({
      action: z.enum(["refresh", "rotate"]),
      petId: z.string().min(1).max(100),
      id: z.uuid(),
      expectedRevision: z.number().int().positive().max(2_147_483_646),
      consent: z.literal(true),
      expiresInDays: cardExpiryDays,
      card: publicPetCardSchema.strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("revoke"),
      petId: z.string().min(1).max(100),
      id: z.uuid(),
      expectedRevision: z.number().int().positive().max(2_147_483_646),
    })
    .strict(),
]);
export type ManagedCardMutation = z.infer<typeof managedCardMutation>;
export function managedCardPath(token: string) {
  if (!MANAGED_CARD_TOKEN.test(token)) throw new Error("Link inválido.");
  return `/p/${token}`;
}
