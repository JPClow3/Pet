import { z } from "zod";
import { isSameOriginRequest } from "@/lib/http/same-origin";
import {
  pushAgendaSchema,
  pushPreferencesSchema,
  pushSubscriptionSchema,
} from "./schema";
import type {
  publishPushAgenda,
  readPushDevices,
  revokePushDevice,
} from "./server";

const mutationSchema = z
  .object({
    installationId: z.uuid(),
    expectedRevision: z.number().int().min(0).max(2_147_483_645),
    subscription: pushSubscriptionSchema,
    preferences: pushPreferencesSchema,
    agenda: pushAgendaSchema,
    consent: z.literal(true),
    vapidPublicKey: z.string().min(1).max(200),
  })
  .strict();
const deletionSchema = z.object({ installationId: z.uuid() }).strict();
type Services = {
  currentUser: () => Promise<{ id: string; emailVerified: boolean } | null>;
  read: typeof readPushDevices;
  publish: typeof publishPushAgenda;
  revoke: typeof revokePushDevice;
  configuration: () => { enabled: boolean; publicKey: string | null };
  now?: () => Date;
};
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("JSON required");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Body required");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > 350_000) {
        await reader.cancel();
        throw new Error("Too large");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function createPushHandlers(services: Services) {
  async function handle(request: Request) {
    try {
      const config = services.configuration();
      if (request.method !== "GET" && !isSameOriginRequest(request))
        return json({ error: "Origem não permitida" }, 403);
      const user = await services.currentUser();
      if (!user)
        return json(
          {
            error: "Entre na conta para gerenciar avisos",
            configuration: config,
          },
          401,
        );
      if (
        !user.emailVerified ||
        request.headers.get("X-PetHub-User") !== user.id
      )
        return json({ error: "Confirme o e-mail e confira a sessão" }, 403);
      if (request.method === "GET") {
        const requestedId = new URL(request.url).searchParams.get(
          "installationId",
        );
        if (requestedId && !z.uuid().safeParse(requestedId).success)
          return json({ error: "Aparelho inválido" }, 400);
        return json({
          configuration: config,
          devices: await services.read(user.id, requestedId ?? undefined),
        });
      }
      let raw: unknown;
      try {
        raw = await readBody(request);
      } catch {
        return json(
          { error: "Dados de aviso inválidos ou muito grandes" },
          400,
        );
      }
      if (request.method === "DELETE") {
        const parsed = deletionSchema.safeParse(raw);
        if (!parsed.success) return json({ error: "Aparelho inválido" }, 400);
        await services.revoke(user.id, parsed.data.installationId);
        return json({ revoked: true });
      }
      if (!config.enabled || !config.publicKey)
        return json(
          { error: "Avisos ainda não configurados nesta instalação" },
          503,
        );
      const parsed = mutationSchema.safeParse(raw);
      if (!parsed.success)
        return json({ error: "Agenda ou assinatura inválida" }, 400);
      const input = parsed.data;
      const now = (services.now?.() ?? new Date()).getTime();
      const generated = Date.parse(input.agenda.generatedAt),
        until = Date.parse(input.agenda.validUntil);
      if (
        input.vapidPublicKey !== config.publicKey ||
        generated < now - 5 * 60_000 ||
        generated > now + 60_000 ||
        until <= now ||
        until > now + 7 * 86_400_000 + 60_000 ||
        input.agenda.occurrences.some(
          (item) =>
            Date.parse(item.dueAt) < generated - 6 * 60 * 60_000 ||
            Date.parse(item.expiresAt) > until ||
            Date.parse(item.expiresAt) <= generated ||
            Date.parse(item.expiresAt) >
              Date.parse(item.dueAt) + 6 * 60 * 60_000 ||
            Date.parse(item.expiresAt) <= Date.parse(item.dueAt),
        )
      )
        return json(
          { error: "A agenda ficou desatualizada. Prepare novamente." },
          400,
        );
      const devices = await services.read(user.id);
      if (
        input.expectedRevision === 0 &&
        devices.filter((item) => item.status === "active").length >= 10
      )
        return json(
          { error: "Desative um aparelho antes de adicionar outro" },
          409,
        );
      const saved = await services.publish(user.id, input);
      return saved
        ? json({ device: saved })
        : json(
            {
              error:
                "A agenda mudou em outra aba. Atualize antes de tentar novamente.",
            },
            409,
          );
    } catch {
      return json(
        {
          error:
            "Não foi possível acessar os avisos agora. A agenda local foi preservada.",
        },
        503,
      );
    }
  }
  return { GET: handle, PUT: handle, DELETE: handle };
}
