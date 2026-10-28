import {
  readSitterPassByToken,
  recordSitterCareAction,
  verifySitterPassPinAndRead,
} from "@/lib/cloud/server-collaboration";
import { SITTER_PASS_TOKEN } from "@/lib/domain/collaboration";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });

type Params = Promise<{ token: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params },
) {
  try {
    const { token } = await params;
    if (!SITTER_PASS_TOKEN.test(token)) {
      return reply({ error: "Token de cuidador inválido" }, 400);
    }

    const pass = await readSitterPassByToken(token);
    if (!pass) {
      return reply(
        { error: "Acesso de cuidador não encontrado, expirado ou revogado." },
        404,
      );
    }

    return reply(pass);
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : "Erro ao carregar dados do cuidador" },
      500,
    );
  }
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("verify_pin"),
    pin: z.string().regex(/^\d{4,6}$/),
  }),
  z.object({
    action: z.literal("record_care"),
    eventType: z.enum(["medication_dose", "meal"]),
    eventKey: z.string().min(1).max(200),
    status: z.enum(["given", "served"]),
    actorName: z.string().min(1).max(80),
    payload: z.record(z.string(), z.unknown()).optional(),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Params },
) {
  try {
    const { token } = await params;
    if (!SITTER_PASS_TOKEN.test(token)) {
      return reply({ error: "Token de cuidador inválido" }, 400);
    }

    const json = await request.json();
    const parsed = postSchema.parse(json);

    if (parsed.action === "verify_pin") {
      const result = await verifySitterPassPinAndRead(token, parsed.pin);
      if (!result.verified) {
        return reply({ error: "PIN incorreto. Tente novamente." }, 401);
      }
      return reply({ verified: true, data: result.data });
    }

    if (parsed.action === "record_care") {
      const success = await recordSitterCareAction(token, {
        eventType: parsed.eventType,
        eventKey: parsed.eventKey,
        status: parsed.status,
        actorName: parsed.actorName,
        payload: parsed.payload,
      });

      if (!success) {
        return reply({ error: "Não foi possível registrar o cuidado." }, 400);
      }
      return reply({ success: true }, 201);
    }

    return reply({ error: "Ação não reconhecida" }, 400);
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : "Erro na operação do cuidador" },
      400,
    );
  }
}
