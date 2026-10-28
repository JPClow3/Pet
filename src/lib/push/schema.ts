import { z } from "zod";
import { Temporal } from "@js-temporal/polyfill";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const timeZone = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    // Preferences require a named IANA zone, not a fixed numeric offset.
    if (/^[+-]/.test(value) || value.trim() !== value) return false;
    try {
      Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(value);
      return true;
    } catch {
      return false;
    }
  }, "Informe um fuso horário IANA válido");

export const pushPreferencesSchema = z
  .object({
    prevention: z.boolean(),
    routine: z.boolean(),
    timeZone,
    dailyTime: time,
    quietStart: time,
    quietEnd: time,
    quietEnabled: z.boolean(),
  })
  .strict()
  .refine(
    (value) => !value.quietEnabled || value.quietStart !== value.quietEnd,
    "Escolha horários diferentes para iniciar e terminar o silêncio",
  );
export type PushPreferences = z.infer<typeof pushPreferencesSchema>;
export function defaultPushPreferences(zone = "UTC"): PushPreferences {
  return pushPreferencesSchema.parse({
    prevention: true,
    routine: true,
    timeZone: zone,
    dailyTime: "09:00",
    quietStart: "22:00",
    quietEnd: "07:00",
    quietEnabled: true,
  });
}

function permittedEndpoint(value: string) {
  if (
    !/^https:\/\//i.test(value) ||
    /[\s\\#]/.test(value) ||
    /^https:\/\/[^/?#]*@/i.test(value)
  )
    return false;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      url.port
    )
      return false;
    const host = url.hostname;
    return (
      [
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
      ].includes(host) ||
      /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+notify\.windows\.com$/.test(host)
    );
  } catch {
    return false;
  }
}

function keyBytes(value: string, length: number, uncompressed = false) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return false;
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const canonical = btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return (
      binary.length === length &&
      canonical === value &&
      (!uncompressed || binary.charCodeAt(0) === 4)
    );
  } catch {
    return false;
  }
}

export const pushSubscriptionSchema = z
  .object({
    endpoint: z
      .string()
      .min(1)
      .max(4096)
      .refine(permittedEndpoint, "Serviço de notificações não permitido"),
    expirationTime: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER)
      .nullable(),
    keys: z
      .object({
        p256dh: z
          .string()
          .length(87)
          .refine(
            (value) => keyBytes(value, 65, true),
            "Chave pública inválida",
          ),
        auth: z
          .string()
          .length(22)
          .refine(
            (value) => keyBytes(value, 16),
            "Chave de autenticação inválida",
          ),
      })
      .strict(),
  })
  .strict();
export type PushSubscriptionData = z.infer<typeof pushSubscriptionSchema>;

const instant = z.iso.datetime({ offset: true });
export const pushOccurrenceSchema = z
  .object({
    key: z.string().min(1).max(240),
    kind: z.enum(["prevention", "routine"]),
    dueAt: instant,
    expiresAt: instant,
    suppressed: z.boolean(),
  })
  .strict();
export type PushOccurrence = z.infer<typeof pushOccurrenceSchema>;
export const pushAgendaSchema = z
  .object({
    generatedAt: instant,
    validUntil: instant,
    occurrences: z.array(pushOccurrenceSchema).max(1000),
  })
  .strict()
  .superRefine((agenda, context) => {
    const start = Date.parse(agenda.generatedAt),
      end = Date.parse(agenda.validUntil);
    if (end <= start || end - start > 7 * 86_400_000)
      context.addIssue({
        code: "custom",
        message: "A agenda deve ter validade de até sete dias",
      });
    const keys = new Set<string>();
    for (const occurrence of agenda.occurrences) {
      const due = Date.parse(occurrence.dueAt),
        expiry = Date.parse(occurrence.expiresAt);
      if (keys.has(occurrence.key))
        context.addIssue({ code: "custom", message: "Ocorrência duplicada" });
      keys.add(occurrence.key);
      if (
        due < start - 6 * 60 * 60_000 ||
        due >= end ||
        expiry <= start ||
        expiry <= due ||
        expiry > due + 6 * 60 * 60_000 ||
        expiry > end
      )
        context.addIssue({
          code: "custom",
          message: "Ocorrência fora da validade da agenda",
        });
    }
  });
export type PushAgenda = z.infer<typeof pushAgendaSchema>;
