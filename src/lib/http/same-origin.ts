/** Match the browser Origin against the incoming authority, not Next's bind hostname. */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const url = new URL(request.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = request.headers.get("host");
    if (host !== null && (!host || /[\s,/@\\?#%]/.test(host))) return false;
    // Host is a browser-forbidden request header. Next may reconstruct request.url
    // from its listening hostname; Workers expose the original URL. Never use
    // arbitrary X-Forwarded-Host/Forwarded headers to choose the authority.
    const expected =
      host === null ? url.origin : new URL(`${url.protocol}//${host}`).origin;
    return origin === expected;
  } catch {
    return false;
  }
}
