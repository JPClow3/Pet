/** Public card paths and Web Push endpoints carry access capabilities. */
const FILTERED = "[Filtered]";
const AUTH_QUERY_NAMES =
  "(?:code|token|access_token|refresh_token|id_token|token_hash|session_token|session_id|session|password|secret|client_secret|code_verifier|api_key|apikey|authorization|credential|csrf_token|state|otp|reset_token|recovery_token|verification_token|auth_token|p256dh|auth|push_vapid_private_key)";
const authQuery = new RegExp(
  `(^|[?&#])(${AUTH_QUERY_NAMES})=([^&#\\s\"'<>]*)`,
  "gi",
);
const encodedAuthQuery = new RegExp(
  `((?:%3f|%26|%23))(${AUTH_QUERY_NAMES})(%3d)(.*?)(?=%26|%23|[\\s\"'<>]|$)`,
  "gi",
);
// Match complete vendor hostnames, including the Windows subdomain boundary.
// Keep the service origin for diagnostics; discard every path/query/fragment.
const pushHost =
  "(?:fcm\\.googleapis\\.com|updates\\.push\\.services\\.mozilla\\.com|web\\.push\\.apple\\.com|(?:[a-z0-9-]+\\.)+notify\\.windows\\.com)";
const pushUrl = new RegExp(
  `(https?:\\/\\/)(?:[^\\s/?#@\"'<>]+@)?(${pushHost}(?::\\d+)?)(?=[/?#\\s\"'<>)}\\]]|$)(?:[/?#][^\\s\"'<>)}\\]]*)?`,
  "gi",
);
const encodedPushUrl = new RegExp(
  `(https?%3a%2f%2f${pushHost}(?:%3a\\d+)?)(?=%2f|%3f|%23|[\\s\"'<>)}\\]]|$)(?:(?:%2f|%3f|%23)[^\\s\"'<>)}\\]]*)?`,
  "gi",
);

export function sanitizeTelemetryString(value: string): string {
  return value
    .replace(pushUrl, `$1$2/${FILTERED}`)
    .replace(encodedPushUrl, `$1%2F${FILTERED}`)
    .replace(
      /\b(PUSH_VAPID_PRIVATE_KEY)(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      `$1$2${FILTERED}`,
    )
    .replace(/\/p\/[A-Za-z0-9_-]+(?:=|%3d){0,2}/gi, "/p/[Filtered]")
    .replace(/(%2fp%2f)[A-Za-z0-9_-]+(?:%3d){0,2}/gi, "$1[Filtered]")
    .replace(
      authQuery,
      (_match, separator: string, key: string) =>
        `${separator}${key}=${FILTERED}`,
    )
    .replace(
      encodedAuthQuery,
      (_match, separator: string, key: string, equals: string) =>
        `${separator}${key}${equals}${FILTERED}`,
    )
    .replace(/([a-z][a-z\d+.-]*:\/\/)[^\s/?#@]+@/gi, `$1${FILTERED}@`);
}

const normalizeKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "");
const secretKeys = new Set([
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "tokenhash",
  "sessiontoken",
  "sessionid",
  "resettoken",
  "recoverytoken",
  "verificationtoken",
  "authtoken",
  "password",
  "secret",
  "clientsecret",
  "codeverifier",
  "apikey",
  "authorization",
  "proxyauthorization",
  "cookie",
  "setcookie",
  "xapikey",
  "xauthtoken",
  "xcsrftoken",
  "csrftoken",
  "credential",
  "p256dh",
  "privatekey",
  "pushvapidprivatekey",
  "vapidprivatekey",
  "subscriptionendpoint",
  "pushsubscriptionendpoint",
  "subscriptionkeysauth",
  "subscriptionkeysp256dh",
  "keysauth",
  "keysp256dh",
]);
const subscriptionKeys = new Set(["subscription", "pushsubscription"]);
const queryKeys = new Set(["query", "querystring", "searchparams", "params"]);
const bodyKeys = new Set([
  "requestbody",
  "responsebody",
  "httprequestbody",
  "httpresponsebody",
  "requestdata",
  "responsedata",
]);

/**
 * Clone JSON telemetry without mutating the app's objects. Keep diagnostics such
 * as method, status, duration and harmless query parameters; omit body contents.
 */
export function sanitizeTelemetry<T>(value: T): T {
  const ancestors = new WeakSet<object>();

  function visit(current: unknown, parentKey = "", depth = 0): unknown {
    if (typeof current === "string") return sanitizeTelemetryString(current);
    if (current === null || typeof current !== "object") return current;
    if (current instanceof Date) return current;
    if (depth > 40 || ancestors.has(current)) return FILTERED;
    ancestors.add(current);

    let result: unknown;
    if (Array.isArray(current)) {
      // Sentry also accepts query_string as an array of [name, value] pairs.
      result = current.map((item) => {
        if (
          queryKeys.has(parentKey) &&
          Array.isArray(item) &&
          typeof item[0] === "string" &&
          isSecret(item[0], parentKey)
        ) {
          return [item[0], FILTERED];
        }
        return visit(item, parentKey, depth + 1);
      });
    } else {
      const subscription =
        subscriptionKeys.has(parentKey) ||
        ("endpoint" in current && "keys" in current);
      result = Object.fromEntries(
        Object.entries(current).flatMap(([key, item]) => {
          const normalized = normalizeKey(key);
          const requestOrResponse =
            parentKey === "request" || parentKey === "response";
          if (
            normalized === "cookies" ||
            bodyKeys.has(normalized) ||
            (requestOrResponse &&
              (normalized === "data" || normalized === "body")) ||
            (parentKey === "data" && normalized === "body")
          )
            return [];
          return [
            [
              sanitizeTelemetryString(key),
              isSecret(key, parentKey) ||
              (subscription && normalized === "endpoint") ||
              (subscriptionKeys.has(normalized) && typeof item === "string")
                ? FILTERED
                : visit(item, normalized, depth + 1),
            ],
          ];
        }),
      );
    }

    ancestors.delete(current);
    return result;
  }

  return visit(value) as T;
}

function isSecret(key: string, parentKey: string): boolean {
  const normalized = normalizeKey(key);
  return (
    secretKeys.has(normalized) ||
    (parentKey === "keys" && normalized === "auth") ||
    (queryKeys.has(parentKey) &&
      (normalized === "code" ||
        normalized === "session" ||
        normalized === "state" ||
        normalized === "otp"))
  );
}

// Installed Sentry options expose each of these hooks. Transaction filtering
// alone does not cover standalone spans, logs, metrics or future breadcrumbs.
export const telemetryPrivacyHooks = {
  beforeSend: sanitizeTelemetry,
  beforeSendTransaction: sanitizeTelemetry,
  beforeSendSpan: sanitizeTelemetry,
  beforeBreadcrumb: sanitizeTelemetry,
  beforeSendLog: sanitizeTelemetry,
  beforeSendMetric: sanitizeTelemetry,
};
