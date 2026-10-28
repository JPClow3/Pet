import { describe, expect, it } from "vitest";

import {
  sanitizeTelemetry,
  sanitizeTelemetryString,
  telemetryPrivacyHooks,
} from "./telemetry-privacy";

const cardCode = Buffer.from(
  JSON.stringify({
    name: "Pet de teste",
    contact: "private@example.test",
    health: "private-health-note",
  }),
).toString("base64url");
const cardUrl = `https://pets.example.test/p/${cardCode}`;

describe("privacidade da telemetria", () => {
  it("remove snapshots públicos em URLs, mensagens, contextos, navegação e traces sem alterar a origem", () => {
    const event = {
      event_id: "event-123",
      message: `Failed to render ${cardUrl}?view=card`,
      request: { url: cardUrl, method: "GET" },
      exception: {
        values: [
          {
            type: "Error",
            value: `GET /p/${cardCode}`,
            stacktrace: { frames: [{ filename: cardUrl, lineno: 42 }] },
          },
        ],
      },
      breadcrumbs: [
        { category: "navigation", data: { from: "/pets", to: cardUrl } },
      ],
      contexts: {
        trace: { description: `GET ${cardUrl}`, data: { "http.url": cardUrl } },
      },
      spans: [
        {
          description: `fetch ${cardUrl}`,
          data: { url: cardUrl, status_code: 500 },
        },
      ],
      extra: { [cardUrl]: "route label", count: 3 },
    };

    const filtered = sanitizeTelemetry(event);
    expect(JSON.stringify(filtered)).not.toContain(cardCode);
    expect(filtered.message).toBe(
      "Failed to render https://pets.example.test/p/[Filtered]?view=card",
    );
    expect(filtered.request).toEqual({
      url: "https://pets.example.test/p/[Filtered]",
      method: "GET",
    });
    expect(filtered.spans[0].data.status_code).toBe(500);
    expect(filtered.extra.count).toBe(3);
    expect(event.request.url).toBe(cardUrl);
    expect(event.message).toContain(cardCode);
  });

  it.each([
    [
      "/account?token=reset-secret&view=reset",
      "/account?token=[Filtered]&view=reset",
    ],
    [
      "https://pets.example.test/account#access_token=access-secret&refresh_token=refresh-secret&view=profile",
      "https://pets.example.test/account#access_token=[Filtered]&refresh_token=[Filtered]&view=profile",
    ],
    [
      "GET /account?code=oauth-secret&next=%2Fpets",
      "GET /account?code=[Filtered]&next=%2Fpets",
    ],
    ["TOKEN=secret&sort=asc", "TOKEN=[Filtered]&sort=asc"],
    [
      "/account?state=oauth-nonce&otp=123456&view=reset",
      "/account?state=[Filtered]&otp=[Filtered]&view=reset",
    ],
    [
      "callbackURL=%2Faccount%3Ftoken%3Dsecret%26view%3Dreset",
      "callbackURL=%2Faccount%3Ftoken%3D[Filtered]%26view%3Dreset",
    ],
    [
      `/account?next=${encodeURIComponent(cardUrl)}`,
      "/account?next=https%3A%2F%2Fpets.example.test%2Fp%2F[Filtered]",
    ],
  ])(
    "filtra credenciais de URLs e mantém parâmetros não sensíveis: %s",
    (input, expected) => {
      expect(sanitizeTelemetryString(input)).toBe(expected);
    },
  );

  it("omite corpos e cookies, filtra headers e preserva diagnósticos de requisição", () => {
    const input = {
      request: {
        url: "/api/cloud/snapshot",
        method: "PUT",
        data: { pets: [{ notes: "private-health-note" }] },
        body: "private-health-note",
        cookies: { session: "cookie-secret" },
        headers: {
          Authorization: "Bearer auth-secret",
          "Content-Type": "application/json",
          Referer: `${cardUrl}?token=secret`,
        },
        query_string: {
          token: "query-secret",
          code: "oauth-secret",
          page: "2",
        },
      },
      breadcrumbs: [
        {
          category: "fetch",
          data: {
            url: "/api/cloud/snapshot",
            body: "private-health-note",
            status_code: 200,
          },
        },
      ],
      spans: [
        {
          data: {
            "http.request.body": "private-health-note",
            "http.response.body": "private-health-note",
            "http.request.method": "PUT",
          },
        },
      ],
    };
    const result = sanitizeTelemetry(input);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(
      /private-health-note|cookie-secret|auth-secret|query-secret|oauth-secret/,
    );
    expect(result.request).not.toHaveProperty("data");
    expect(result.request).not.toHaveProperty("body");
    expect(result.request).not.toHaveProperty("cookies");
    expect(result.request.headers["Content-Type"]).toBe("application/json");
    expect(result.request.method).toBe("PUT");
    expect(result.request.query_string.page).toBe("2");
    expect(input.request.data.pets[0].notes).toBe("private-health-note");
  });

  it("filtra query_string em pares e códigos em parâmetros sem apagar códigos de erro", () => {
    const result = sanitizeTelemetry({
      request: {
        query_string: [
          ["code", "private-code"],
          ["page", "2"],
        ],
      },
      contexts: { route: { params: { code: cardCode, page: "overview" } } },
      extra: { code: "E_NETWORK", status: 403, ok: false, missing: null },
    });
    expect(result.request.query_string).toEqual([
      ["code", "[Filtered]"],
      ["page", "2"],
    ]);
    expect(result.contexts.route.params.code).toBe("[Filtered]");
    expect(result.extra).toEqual({
      code: "E_NETWORK",
      status: 403,
      ok: false,
      missing: null,
    });
  });

  it("filtra usuário e senha embutidos em URL de conexão", () => {
    expect(
      sanitizeTelemetryString(
        "Connection failed postgres://app:secret@db.example.test/pets?sslmode=require",
      ),
    ).toBe(
      "Connection failed postgres://[Filtered]@db.example.test/pets?sslmode=require",
    );
  });

  it.each([
    "https://fcm.googleapis.com/fcm/send/private-capability?device=private-query#private-fragment",
    "https://updates.push.services.mozilla.com/wpush/v2/private-capability",
    "https://web.push.apple.com/private-capability",
    "https://wns2-par02p.notify.windows.com/?token=private-capability",
    "https://region.service.notify.windows.com/private-capability",
    "https://user:private-password@fcm.googleapis.com/fcm/send/private-capability",
  ])(
    "filtra a capacidade da URL Web Push em todos os canais: %s",
    (endpoint) => {
      const origin = new URL(endpoint).origin;
      for (const filter of Object.values(telemetryPrivacyHooks)) {
        const result = filter({
          message: `POST ${endpoint}`,
          data: { url: endpoint, status_code: 410 },
        });
        expect(result.message).toBe(`POST ${origin}/[Filtered]`);
        expect(result.data.url).toBe(`${origin}/[Filtered]`);
        expect(result.data.status_code).toBe(410);
        expect(JSON.stringify(result)).not.toContain("private-capability");
        expect(JSON.stringify(result)).not.toContain("private-query");
      }
    },
  );

  it("filtra URLs push codificadas sem confundir domínios parecidos", () => {
    const endpoint =
      "https://web.push.apple.com/private-capability?opaque=private-query";
    expect(
      sanitizeTelemetryString(`next=${encodeURIComponent(endpoint)}`),
    ).toBe("next=https%3A%2F%2Fweb.push.apple.com%2F[Filtered]");
    for (const safe of [
      "https://fcm.googleapis.com.example.test/public",
      "https://evilnotify.windows.com/public",
      "https://notify.windows.com.example.test/public",
      "https://pets.example.test/api/push/device?status=active",
    ])
      expect(sanitizeTelemetryString(safe)).toBe(safe);
  });

  it("filtra assinaturas estruturadas e chaves privadas sem apagar diagnósticos", () => {
    const subscription = {
      endpoint: "https://other-push.example.test/opaque-endpoint",
      expirationTime: 123,
      keys: { p256dh: "private-p256dh", auth: "private-auth" },
    };
    const input = {
      subscription,
      unwrapped: subscription,
      extra: {
        "subscription.endpoint": "opaque-endpoint",
        "keys.auth": "private-auth",
        PUSH_VAPID_PRIVATE_KEY: "private-vapid",
      },
      vapid: {
        publicKey: "public-key",
        privateKey: "private-vapid",
        subject: "https://pets.example.test",
      },
      auth: { provider: "neon", authenticated: true },
      endpoint: "/api/push/device",
      status: 201,
    };
    const result = sanitizeTelemetry(input);
    expect(result.subscription).toEqual({
      endpoint: "[Filtered]",
      expirationTime: 123,
      keys: { p256dh: "[Filtered]", auth: "[Filtered]" },
    });
    expect(result.unwrapped).toEqual(result.subscription);
    expect(result.vapid.publicKey).toBe("public-key");
    expect(result.auth).toEqual(input.auth);
    expect(result.endpoint).toBe("/api/push/device");
    expect(result.status).toBe(201);
    expect(JSON.stringify(result)).not.toMatch(
      /opaque-endpoint|private-p256dh|private-auth|private-vapid/,
    );
    expect(input.subscription.keys.auth).toBe("private-auth");
  });

  it("filtra assinaturas serializadas e a chave VAPID em mensagens de configuração", () => {
    const result = sanitizeTelemetry({
      subscription: '{"keys":{"auth":"private-auth"}}',
      message: 'env PUSH_VAPID_PRIVATE_KEY="private-vapid"; PUSH_ENABLED=true',
    });
    expect(result.subscription).toBe("[Filtered]");
    expect(result.message).toBe(
      "env PUSH_VAPID_PRIVATE_KEY=[Filtered]; PUSH_ENABLED=true",
    );
  });

  it("preserva mensagens, logs e valores não relacionados", () => {
    const date = new Date("2026-10-25T12:00:00Z");
    const input = {
      message: "Falha de conexão",
      body: "Route /pets?tab=health loaded",
      numbers: [1, 2],
      enabled: true,
      date,
      undefinedValue: undefined,
    };
    expect(sanitizeTelemetry(input)).toEqual(input);
    expect(sanitizeTelemetryString("/p/[code]")).toBe("/p/[code]");
  });

  it("protege todos os canais configurados e não trava com referências circulares", () => {
    const circular: { url: string; self?: unknown } = { url: cardUrl };
    circular.self = circular;
    for (const filter of Object.values(telemetryPrivacyHooks)) {
      const result = filter({ extra: circular, message: cardUrl });
      expect(result.extra.self).toBe("[Filtered]");
      expect(JSON.stringify(result)).not.toContain(cardCode);
    }
  });
});
