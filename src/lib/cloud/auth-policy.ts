type SessionUser = { id: string; emailVerified: boolean };

const securityActions = new Set([
  "change-password",
  "revoke-other-sessions",
  "revoke-sessions",
  "revoke-session",
]);

function reject(code: string, status: number) {
  return Response.json(
    { code, message: "Não foi possível concluir esta ação da conta." },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Vary: "Cookie",
      },
    },
  );
}

export async function checkAccountAction(
  request: Request,
  path: string,
  currentUser: () => Promise<SessionUser | null>,
) {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  // Keep deletion closed until both cascading cleanup is deployed and the
  // managed provider's deletion feature is confirmed. A schema-advertised API
  // alone does not establish that the provider has enabled this feature.
  if (
    normalized === "delete-user" ||
    normalized.startsWith("delete-user/") ||
    normalized === "admin/remove-user"
  )
    return reject("ACCOUNT_DELETION_UNAVAILABLE", 403);

  if (!securityActions.has(normalized)) return null;
  if (request.method !== "POST") return reject("METHOD_NOT_ALLOWED", 405);
  try {
    const user = await currentUser();
    if (!user) return reject("UNAUTHORIZED", 401);
    if (!user.emailVerified || request.headers.get("X-PetHub-User") !== user.id)
      return reject("ACCOUNT_CHANGED", 403);
    return null;
  } catch {
    return reject("SESSION_UNAVAILABLE", 503);
  }
}
