import { isSameOriginRequest } from "@/lib/http/same-origin";
import { verifiedCloudUser } from "@/lib/cloud/server-auth";
import {
  fetchRecentCareEvents,
  logSharedCareEvent,
} from "@/lib/cloud/server-collaboration";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      Vary: "Cookie",
    },
  });

const logEventSchema = z.object({
  petId: z.string().min(1).max(100),
  ownerUserId: z.string().min(1).max(200),
  actorName: z.string().min(1).max(80),
  actorRole: z.enum(["tutor", "co_tutor", "cuidador"]),
  eventType: z.enum(["medication_dose", "meal", "care_note", "walk"]),
  recordId: z.string().max(100).nullable().optional(),
  scheduleId: z.string().max(100).nullable().optional(),
  eventKey: z.string().min(1).max(200),
  status: z.enum(["given", "skipped", "missed", "served", "completed"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await verifiedCloudUser();
    if (!user) return reply({ error: "Sign in required" }, 401);
    if (!user.emailVerified || request.headers.get("X-PetHub-User") !== user.id)
      return reply({ error: "Session changed or email not verified" }, 403);

    const url = new URL(request.url);
    const petId = url.searchParams.get("petId");
    const since = url.searchParams.get("since") ?? undefined;
    if (!petId) return reply({ error: "Parâmetro petId obrigatório" }, 400);

    const events = await fetchRecentCareEvents(user.id, petId, since);
    return reply({ events });
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : "Erro ao buscar eventos de cuidados" },
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return reply({ error: "Origin not allowed" }, 403);
    const user = await verifiedCloudUser();
    if (!user) return reply({ error: "Sign in required" }, 401);
    if (!user.emailVerified || request.headers.get("X-PetHub-User") !== user.id)
      return reply({ error: "Session changed or email not verified" }, 403);

    const json = await request.json();
    const parsed = logEventSchema.parse(json);

    const event = await logSharedCareEvent(user.id, {
      petId: parsed.petId,
      ownerUserId: parsed.ownerUserId,
      actorName: parsed.actorName,
      actorRole: parsed.actorRole,
      eventType: parsed.eventType,
      recordId: parsed.recordId ?? null,
      scheduleId: parsed.scheduleId ?? null,
      eventKey: parsed.eventKey,
      status: parsed.status,
      payload: parsed.payload ?? {},
    });

    return reply({ event }, 201);
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : "Erro ao registrar evento de cuidados" },
      400,
    );
  }
}
