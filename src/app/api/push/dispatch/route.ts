import { dispatchPush } from "@/lib/push/dispatcher";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || process.env.PUSH_DISPATCH_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const [scheme, token] = authHeader.split(" ");
  return scheme?.toLowerCase() === "bearer" && token === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { error: "Não autorizado" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const result = await dispatchPush({
      PUSH_ENABLED: process.env.PUSH_ENABLED,
      PUSH_DATABASE_URL: process.env.PUSH_DATABASE_URL,
      PUSH_VAPID_PUBLIC_KEY: process.env.PUSH_VAPID_PUBLIC_KEY,
      PUSH_VAPID_PRIVATE_KEY: process.env.PUSH_VAPID_PRIVATE_KEY,
      PUSH_VAPID_SUBJECT: process.env.PUSH_VAPID_SUBJECT,
    });

    return Response.json(
      { ok: true, result },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[push/dispatch] Erro ao disparar avisos:", error);
    return Response.json(
      { error: "Falha na execução do despachante" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
