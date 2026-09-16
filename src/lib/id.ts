export function newId(prefix: string): string {
  const globalCrypto =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (globalCrypto && "randomUUID" in globalCrypto) {
    return `${prefix}-${globalCrypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
