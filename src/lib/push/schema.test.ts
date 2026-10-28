import { describe, expect, it } from "vitest";
import {
  defaultPushPreferences,
  pushAgendaSchema,
  pushPreferencesSchema,
  pushSubscriptionSchema,
} from "./schema";

function subscription(endpoint = "https://fcm.googleapis.com/fcm/send/opaque") {
  return {
    endpoint,
    expirationTime: null,
    keys: {
      p256dh: Buffer.from([4, ...Array(64).fill(1)]).toString("base64url"),
      auth: Buffer.alloc(16, 2).toString("base64url"),
    },
  };
}
function agenda() {
  return {
    generatedAt: "2026-10-25T12:00:00Z",
    validUntil: "2026-11-01T12:00:00Z",
    occurrences: [
      {
        key: "opaque:1",
        kind: "routine",
        dueAt: "2026-10-25T12:00:00Z",
        expiresAt: "2026-10-25T12:30:00Z",
        suppressed: false,
      },
    ],
  };
}
describe("contratos de avisos privados", () => {
  it("fornece preferências explícitas e valida fuso e horários", () => {
    expect(defaultPushPreferences()).toEqual({
      prevention: true,
      routine: true,
      timeZone: "UTC",
      dailyTime: "09:00",
      quietStart: "22:00",
      quietEnd: "07:00",
      quietEnabled: true,
    });
    expect(defaultPushPreferences("America/Sao_Paulo").timeZone).toBe(
      "America/Sao_Paulo",
    );
    for (const timeZone of ["+03:00", "invalid/zone", " UTC", ""])
      expect(
        pushPreferencesSchema.safeParse({
          ...defaultPushPreferences(),
          timeZone,
        }).success,
      ).toBe(false);
    expect(
      pushPreferencesSchema.safeParse({
        ...defaultPushPreferences(),
        dailyTime: "24:00",
      }).success,
    ).toBe(false);
    expect(
      pushPreferencesSchema.safeParse({
        ...defaultPushPreferences(),
        quietStart: "07:00",
      }).success,
    ).toBe(false);
    expect(
      pushPreferencesSchema.safeParse({
        ...defaultPushPreferences(),
        quietStart: "07:00",
        quietEnabled: false,
      }).success,
    ).toBe(true);
  });
  it("aceita somente os serviços de push permitidos", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/x",
      "https://updates.push.services.mozilla.com/wpush/v2/x",
      "https://web.push.apple.com/Qopaque",
      "https://wns2-db5p.notify.windows.com/?token=opaque",
      "https://fcm.googleapis.com:443/send/x",
    ])
      expect(
        pushSubscriptionSchema.safeParse(subscription(endpoint)).success,
      ).toBe(true);
  });
  it("recusa SSRF, domínios parecidos, credenciais, fragmentos e portas alternativas", () => {
    for (const endpoint of [
      "http://fcm.googleapis.com/send/x",
      "https://localhost/",
      "https://127.0.0.1/",
      "https://fcm.googleapis.com.attacker.test/x",
      "https://attackerfcm.googleapis.com/x",
      "https://sub.fcm.googleapis.com/x",
      "https://notify.windows.com/x",
      "https://evilnotify.windows.com/x",
      "https://a.notify.windows.com.evil.test/x",
      "https://user:pass@fcm.googleapis.com/x",
      "https://@fcm.googleapis.com/x",
      "https://fcm.googleapis.com/x#",
      "https://fcm.googleapis.com/x#fragment",
      "https://fcm.googleapis.com:444/x",
      "https://fcm.googleapis.com./x",
      " https://fcm.googleapis.com/x",
      "https://fcm.googleapis.com\\@attacker.test/x",
    ])
      expect(
        pushSubscriptionSchema.safeParse(subscription(endpoint)).success,
        endpoint,
      ).toBe(false);
  });
  it("exige chave pública não comprimida e autenticação base64url canônica", () => {
    const valid = subscription();
    expect(pushSubscriptionSchema.safeParse(valid).success).toBe(true);
    for (const keys of [
      { ...valid.keys, p256dh: Buffer.alloc(65, 2).toString("base64url") },
      { ...valid.keys, p256dh: Buffer.alloc(64, 4).toString("base64url") },
      { ...valid.keys, auth: Buffer.alloc(15).toString("base64url") },
      { ...valid.keys, auth: valid.keys.auth + "==" },
      { ...valid.keys, auth: valid.keys.auth.slice(0, -1) + "B" },
    ])
      expect(pushSubscriptionSchema.safeParse({ ...valid, keys }).success).toBe(
        false,
      );
    expect(
      pushSubscriptionSchema.safeParse({ ...valid, expirationTime: -1 })
        .success,
    ).toBe(false);
  });
  it("recusa nomes e outros campos fora do contrato mínimo", () => {
    expect(
      pushPreferencesSchema.safeParse({
        ...defaultPushPreferences(),
        name: "private",
      }).success,
    ).toBe(false);
    expect(
      pushSubscriptionSchema.safeParse({ ...subscription(), userId: "other" })
        .success,
    ).toBe(false);
    const input = agenda();
    expect(
      pushAgendaSchema.safeParse({
        ...input,
        occurrences: [{ ...input.occurrences[0], title: "private" }],
      }).success,
    ).toBe(false);
  });
  it("valida janela, expiração, unicidade e limites de agenda", () => {
    const input = agenda(),
      item = input.occurrences[0];
    expect(pushAgendaSchema.safeParse(input).success).toBe(true);
    expect(
      pushAgendaSchema.safeParse({
        ...input,
        validUntil: "2026-11-02T12:00:00Z",
      }).success,
    ).toBe(false);
    expect(
      pushAgendaSchema.safeParse({ ...input, validUntil: input.generatedAt })
        .success,
    ).toBe(false);
    expect(
      pushAgendaSchema.safeParse({ ...input, occurrences: [item, item] })
        .success,
    ).toBe(false);
    for (const patch of [
      { dueAt: "2026-10-25T05:59:59Z" },
      { dueAt: input.validUntil },
      { expiresAt: item.dueAt },
      { expiresAt: "2026-11-02T12:00:00Z" },
      { key: "x".repeat(241) },
    ])
      expect(
        pushAgendaSchema.safeParse({
          ...input,
          occurrences: [{ ...item, ...patch }],
        }).success,
      ).toBe(false);
    expect(
      pushAgendaSchema.safeParse({
        ...input,
        occurrences: Array.from({ length: 1001 }, (_, i) => ({
          ...item,
          key: String(i),
        })),
      }).success,
    ).toBe(false);
  });
  it("aceita apenas ocorrências recentes ainda dentro da janela original de entrega", () => {
    const input = agenda();
    expect(
      pushAgendaSchema.safeParse({
        ...input,
        generatedAt: "2026-10-25T12:00:05Z",
      }).success,
    ).toBe(true);
    expect(
      pushAgendaSchema.safeParse({
        ...input,
        generatedAt: "2026-10-25T12:30:00Z",
      }).success,
    ).toBe(false);
    expect(
      pushAgendaSchema.safeParse({
        ...input,
        occurrences: [
          { ...input.occurrences[0], expiresAt: "2026-10-25T18:00:01Z" },
        ],
      }).success,
    ).toBe(false);
  });
});
