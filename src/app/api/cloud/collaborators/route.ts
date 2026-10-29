import { isSameOriginRequest } from "@/lib/http/same-origin";
import { verifiedCloudUser } from "@/lib/cloud/server-auth";
import {
  acceptCollaborationInvite,
  invitePetCollaborator,
  listPetCollaborators,
  removePetCollaborator,
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

const inviteSchema = z.object({
  action: z.literal("invite"),
  petId: z.string().min(1).max(100),
  petName: z.string().min(1).max(60),
  collaboratorEmail: z.string().email().max(120),
  collaboratorName: z.string().min(1).max(80),
  role: z.enum(["co_tutor", "cuidador"]),
});

const acceptSchema = z.object({
  action: z.literal("accept"),
  inviteCode: z.string().min(8).max(100),
});

const removeSchema = z.object({
  action: z.literal("remove"),
  collaboratorId: z.string().uuid(),
});

export async function GET(request: Request) {
  try {
    const user = await verifiedCloudUser();
    if (!user) return reply({ error: "Sign in required" }, 401);
    if (!user.emailVerified || request.headers.get("X-PetHub-User") !== user.id)
      return reply({ error: "Session changed or email not verified" }, 403);

    const petId = new URL(request.url).searchParams.get("petId");
    if (!petId || petId.length > 100) {
      return reply({ error: "Parâmetro petId obrigatório" }, 400);
    }

    const collaborators = await listPetCollaborators(user.id, petId);
    return reply({ collaborators });
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : "Erro ao listar colaboradores" },
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

    const json = (await request.json()) as Record<string, unknown>;
    if (json.action === "invite") {
      const parsed = inviteSchema.parse(json);
      const collaborator = await invitePetCollaborator(user.id, {
        petId: parsed.petId,
        petName: parsed.petName,
        collaboratorEmail: parsed.collaboratorEmail,
        collaboratorName: parsed.collaboratorName,
        role: parsed.role,
      });
      return reply({ collaborator }, 201);
    } else if (json.action === "accept") {
      const parsed = acceptSchema.parse(json);
      const collaborator = await acceptCollaborationInvite(
        user.id,
        user.email,
        parsed.inviteCode,
      );
      if (!collaborator) {
        return reply({ error: "Convite não encontrado ou já aceito" }, 404);
      }
      return reply({ collaborator });
    }

    return reply({ error: "Ação inválida" }, 400);
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : "Erro ao processar convite" },
      400,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return reply({ error: "Origin not allowed" }, 403);
    const user = await verifiedCloudUser();
    if (!user) return reply({ error: "Sign in required" }, 401);
    if (!user.emailVerified || request.headers.get("X-PetHub-User") !== user.id)
      return reply({ error: "Session changed or email not verified" }, 403);

    const json = (await request.json()) as Record<string, unknown>;
    const parsed = removeSchema.parse(json);
    const success = await removePetCollaborator(user.id, parsed.collaboratorId);
    return reply({ success });
  } catch (error) {
    return reply(
      { error: error instanceof Error ? error.message : "Erro ao remover colaborador" },
      400,
    );
  }
}
