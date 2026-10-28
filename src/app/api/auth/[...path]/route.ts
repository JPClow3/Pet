import { NextRequest } from "next/server";
import { getServerAuth, verifiedCloudUser } from "@/lib/cloud/server-auth";
import { checkAccountAction } from "@/lib/cloud/auth-policy";
import { isSameOriginRequest } from "@/lib/http/same-origin";

type Context = { params: Promise<{ path: string[] }> };
async function handle(request: NextRequest, context: Context) {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Cookie",
  };
  if (request.method !== "GET" && !isSameOriginRequest(request))
    return Response.json(
      { error: "Origin not allowed" },
      { status: 403, headers },
    );
  const path = (await context.params).path.join("/");
  const rejected = await checkAccountAction(request, path, verifiedCloudUser);
  if (rejected) return rejected;
  const auth = getServerAuth();
  if (!auth)
    return Response.json(
      { error: "Conta na nuvem não configurada nesta instalação." },
      { status: 503, headers },
    );
  const handlers = auth.handler();
  const method = request.method as keyof typeof handlers;
  let upstreamRequest = request;
  if (path === "get-session") {
    // Verification and account changes must appear immediately in useSession.
    const url = new URL(request.url);
    url.searchParams.set("disableCookieCache", "true");
    upstreamRequest = new NextRequest(url, request);
  }
  const response = await handlers[method](upstreamRequest, context);
  // The SDK proxies an allowlist of upstream headers without Cache-Control.
  response.headers.set("Cache-Control", headers["Cache-Control"]);
  response.headers.append("Vary", "Cookie");
  return response;
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
