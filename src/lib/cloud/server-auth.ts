import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

let instance: ReturnType<typeof createNeonAuth> | null = null;
export function isCloudConfigured() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.DATABASE_URL,
  );
}
export function getServerAuth() {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET)
    return null;
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET,
      sessionDataTtl: 60,
    },
  });
  return instance;
}

export async function verifiedCloudUser() {
  const auth = getServerAuth();
  if (!auth) return null;
  const { data, error } = await auth.getSession({
    query: {
      // Neon 0.7 server code compares this URL query value to the string "true".
      // Keep the live provider check; a cached session cannot authorize pet data.
      disableCookieCache: "true",
    },
  });
  if (error) throw new Error("Session verification failed");
  return data?.user ?? null;
}
