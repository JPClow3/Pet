import { isSameOriginRequest } from "@/lib/http/same-origin";
import { verifiedCloudUser } from "@/lib/cloud/server-auth";
import { saveSitterPass } from "@/lib/cloud/server-collaboration";
import { sitterViewDataSchema } from "@/lib/domain/collaboration";
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

const savePassSchema = z.object({
  petId: z.string().min(1).max(100),
  sitterName: z.string().max(80).nullable().optional(),
  pin: z.string().regex(/^\d{4,6}$/).nullable().optional(),
  expiresInDays: z.number().int().min(1).max(90).optional().default(7),
  passData: sitterViewDataSchema,
});

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return reply({ error: "Origin not allowed" }, 403);
    const user = await verifiedCloudUser();
    if (!user) return reply({ error: "Sign in required" }, 401);
    if (!user.emailVerified || request.headers.get("X-PetHub-User") !== user.id)
      return reply({ error: "Session changed or email not verified" }, 403);

    const json = await request.json();
    const parsed = savePassSchema.parse(json);

    const result = await saveSitterPass(user.id, parsed.petId, parsed.passData, {
      pin: parsed.pin,
      expiresInDays: parsed.expiresInDays,
      sitterName: parsed.sitterName,
    });

    return reply({
      passId: result.passId,
      token: result.token,
      expiresAt: result.expiresAt,
      url: `/sitter/${result.token}`,
    });
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : "Erro ao gerar passe de cuidador" },
      400,
    );
  }
}
