import { z } from "zod";
import {
  MANAGED_CARD_TOKEN,
  managedCardSchema,
  managedCardMutation,
  type ManagedCardMutation,
} from "@/lib/domain/managed-card";
const loadedCardResponse = z.object({ record: managedCardSchema.nullable() });
const changedCardResponse = z.object({
  record: managedCardSchema,
  token: z.string().regex(MANAGED_CARD_TOKEN).nullable(),
});
function parseCardResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error("Resposta de link inválida.");
  return result.data;
}

export class CardConflictError extends Error {
  constructor() {
    super(
      "O link mudou em outro aparelho. Consulte novamente antes de continuar.",
    );
    this.name = "CardConflictError";
  }
}
async function request(
  userId: string,
  url: string,
  init: RequestInit = {},
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", "X-PetHub-User": userId },
  });
  if (response.status === 409) throw new CardConflictError();
  if (response.status === 401 || response.status === 403)
    throw new Error(
      "Entre na conta e confirme o e-mail antes de gerenciar links.",
    );
  if (!response.ok)
    throw new Error(
      "Não foi possível acessar os links. Tente novamente quando estiver conectado.",
    );
  try {
    return await response.json();
  } catch {
    throw new Error("Resposta de link inválida.");
  }
}
export async function loadManagedCard(userId: string, petId: string) {
  const result = await request(
    userId,
    `/api/cloud/cards?petId=${encodeURIComponent(petId)}`,
  );
  return parseCardResponse(loadedCardResponse, result).record;
}
export async function changeManagedCard(
  userId: string,
  input: ManagedCardMutation,
) {
  const result = await request(userId, "/api/cloud/cards", {
    method: "POST",
    body: JSON.stringify(managedCardMutation.parse(input)),
  });
  return parseCardResponse(changedCardResponse, result);
}
