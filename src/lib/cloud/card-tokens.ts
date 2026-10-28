import { MANAGED_CARD_TOKEN } from "@/lib/domain/managed-card";

export function createCardToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `c_${btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")}`;
}
export async function hashCardToken(token: string) {
  if (!MANAGED_CARD_TOKEN.test(token)) throw new Error("Invalid token");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
