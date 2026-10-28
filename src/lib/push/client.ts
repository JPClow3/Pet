"use client";
import { z } from "zod";
import { useAppStore } from "@/lib/store/app-store";
import { buildPushAgenda } from "./planner";
import {
  pushPreferencesSchema,
  pushSubscriptionSchema,
  type PushPreferences,
} from "./schema";

const KEY = "pethub:push:binding:v1";
const EVENT = "pethub-push-binding";
const bindingSchema = z.object({
  installationId: z.uuid(),
  ownerId: z.string(),
  consented: z.boolean(),
  preferences: pushPreferencesSchema,
  revision: z.number().int().min(0),
  publicKey: z.string(),
  signature: z.string().nullable(),
  publishedAt: z.string().nullable(),
  validUntil: z.string().nullable(),
  dirty: z.boolean(),
  revocationPending: z.boolean(),
  error: z.string().nullable(),
});
export type PushBinding = z.infer<typeof bindingSchema>;
let cacheRaw: string | null | undefined;
let cache: PushBinding | null = null;
export function getPushBinding(): PushBinding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cacheRaw) {
      cacheRaw = raw;
      let value: unknown = null;
      try {
        value = raw ? JSON.parse(raw) : null;
      } catch {
        /* An invalid binding grants no consent. */
      }
      const result = bindingSchema.safeParse(value);
      cache = result.success ? result.data : null;
    }
    return cache;
  } catch {
    return cache;
  }
}
export const emptyPushBinding = () => null;
export function subscribePushBinding(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
function saveBinding(value: PushBinding) {
  localStorage.setItem(KEY, JSON.stringify(bindingSchema.parse(value)));
  cacheRaw = undefined;
  window.dispatchEvent(new Event(EVENT));
}
function updateBinding(id: string, patch: Partial<PushBinding>) {
  const current = getPushBinding();
  if (current?.installationId === id) saveBinding({ ...current, ...patch });
}
export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
const pushDeviceSchema = z.object({
  installationId: z.uuid(),
  revision: z.number().int().positive(),
  status: z.enum(["active", "revoked", "expired"]),
  preferences: pushPreferencesSchema,
  publishedAt: z.iso.datetime({ offset: true }),
  validUntil: z.iso.datetime({ offset: true }),
  lastCode: z.number().int().min(100).max(599).nullable(),
});
const pushStatusSchema = z.object({
  configuration: z.object({
    enabled: z.boolean(),
    publicKey: z.string().nullable(),
  }),
  devices: z.array(pushDeviceSchema).max(20),
});
const publishedDeviceSchema = z.object({ device: pushDeviceSchema });
const revokedDeviceSchema = z.object({ revoked: z.literal(true) });
const responseErrorSchema = z.object({ error: z.string() });
export type PushStatus = z.infer<typeof pushStatusSchema>;
function parsePushResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error("Não foi possível atualizar os avisos.");
  return parsed.data;
}
async function request(
  userId: string,
  init: RequestInit = {},
  query = "",
): Promise<unknown> {
  const response = await fetch(`/api/push/device${query}`, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-PetHub-User": userId,
      ...init.headers,
    },
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Não foi possível atualizar os avisos.");
  }
  if (!response.ok) {
    const parsedError = responseErrorSchema.safeParse(data);
    throw new Error(
      parsedError.success
        ? parsedError.data.error
        : "Não foi possível atualizar os avisos.",
    );
  }
  return data;
}
export async function readPushStatus(userId: string): Promise<PushStatus> {
  const binding = getPushBinding();
  return parsePushResponse(
    pushStatusSchema,
    await request(
      userId,
      {},
      binding?.ownerId === userId
        ? `?installationId=${encodeURIComponent(binding.installationId)}`
        : "",
    ),
  );
}
function keyBytes(key: string) {
  const raw = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
async function registration() {
  const result = await navigator.serviceWorker.getRegistration();
  if (!result?.active)
    throw new Error(
      "Abra o app novamente para concluir a instalação dos avisos.",
    );
  return result;
}
export async function pushSourceSignature(preferences: PushPreferences) {
  const state = useAppStore.getState();
  const source = JSON.stringify({
    preferences,
    pets: state.pets.map((p) => p.id),
    records: state.records.map((r) => ({
      id: r.id,
      petId: r.petId,
      type: r.type,
      nextDueDate: r.nextDueDate,
      leadDays: r.leadDays,
      medication: r.medication
        ? {
            activeScheduleId: r.medication.activeScheduleId,
            schedules: r.medication.schedules.map((s) => ({
              id: s.id,
              times: s.times,
              everyDays: s.everyDays,
              startsOn: s.startsOn,
              endsOn: s.endsOn,
              timeZone: s.timeZone,
              effectiveFrom: s.effectiveFrom,
              closedAt: s.closedAt,
            })),
            events: r.medication.events.map((e) => ({
              scheduleId: e.scheduleId,
              date: e.date,
              time: e.time,
              status: e.status,
            })),
          }
        : null,
    })),
    reminders: state.reminders.map((r) => ({
      id: r.id,
      petId: r.petId,
      dueDate: r.dueDate,
      done: r.done,
      leadDays: r.leadDays,
    })),
    snoozes: state.snoozes,
  });
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source)),
    ),
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
let syncing: Promise<void> | null = null;
export async function syncPushAgenda(
  userId: string,
  reconcile = false,
): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    const binding = getPushBinding();
    if (
      !binding ||
      !binding.consented ||
      binding.ownerId !== userId ||
      binding.revocationPending
    )
      return;
    try {
      if (!navigator.onLine)
        throw new Error(
          "Sem conexão: alterações ainda não chegaram à agenda de avisos.",
        );
      if (Notification.permission !== "granted") {
        await disconnectPushForAccount(userId);
        throw new Error(
          "Permissão de avisos removida. Ative novamente quando desejar.",
        );
      }
      const subscription = await (
        await registration()
      ).pushManager.getSubscription();
      if (!subscription)
        throw new Error("A assinatura expirou. Ative os avisos novamente.");
      const signature = await pushSourceSignature(binding.preferences);
      let revision = binding.revision;
      if (reconcile) {
        const remote = await readPushStatus(userId);
        revision =
          remote.devices.find(
            (d) => d.installationId === binding.installationId,
          )?.revision ?? 0;
      }
      const agenda = buildPushAgenda(
        useAppStore.getState(),
        binding.preferences,
      );
      const result = parsePushResponse(
        publishedDeviceSchema,
        await request(userId, {
          method: "PUT",
          body: JSON.stringify({
            installationId: binding.installationId,
            expectedRevision: revision,
            subscription: pushSubscriptionSchema.parse({
              ...subscription.toJSON(),
              expirationTime: subscription.expirationTime ?? null,
            }),
            preferences: binding.preferences,
            agenda,
            consent: true,
            vapidPublicKey: binding.publicKey,
          }),
        }),
      );
      const current = getPushBinding();
      if (
        !current?.consented ||
        current.ownerId !== userId ||
        current.installationId !== binding.installationId
      )
        return;
      updateBinding(binding.installationId, {
        revision: result.device.revision,
        signature,
        publishedAt: result.device.publishedAt,
        validUntil: result.device.validUntil,
        dirty: signature !== (await pushSourceSignature(current.preferences)),
        error: null,
      });
    } catch (cause) {
      updateBinding(binding.installationId, {
        dirty: true,
        error:
          cause instanceof Error
            ? cause.message
            : "Não foi possível atualizar os avisos. Tente novamente.",
      });
      throw cause;
    }
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}
export async function enablePush(
  userId: string,
  preferences: PushPreferences,
  publicKey: string,
): Promise<void> {
  if (!pushSupported())
    throw new Error(
      "Este navegador não oferece avisos web. No iPhone, adicione o app à Tela de Início.",
    );
  // The only permission request in the app: called directly from an explicit user click.
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      permission === "denied"
        ? "Permissão bloqueada. Altere os ajustes do navegador se quiser ativar avisos."
        : "Permissão não concedida. Nenhum aviso foi ativado.",
    );
  const previous = getPushBinding();
  if (previous && previous.ownerId !== userId)
    await disconnectPushForAccount(previous.ownerId);
  const worker = await registration();
  let subscription = await worker.pushManager.getSubscription();
  if (subscription && (!previous || previous.ownerId !== userId)) {
    if (!(await subscription.unsubscribe()))
      throw new Error(
        "Não foi possível desligar a assinatura anterior. Bloqueie a permissão nos ajustes do navegador antes de ativar nesta conta.",
      );
    subscription = null;
  }
  const expected = keyBytes(publicKey);
  const existing = subscription?.options.applicationServerKey;
  if (
    subscription &&
    (!existing ||
      new Uint8Array(existing).some((b, i) => b !== expected[i]) ||
      existing.byteLength !== expected.length)
  ) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await worker.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: expected,
  });
  const same = previous?.ownerId === userId;
  saveBinding({
    installationId: same ? previous.installationId : crypto.randomUUID(),
    ownerId: userId,
    consented: true,
    preferences: pushPreferencesSchema.parse(preferences),
    revision: same ? previous.revision : 0,
    publicKey,
    signature: null,
    publishedAt: same ? previous.publishedAt : null,
    validUntil: same ? previous.validUntil : null,
    dirty: true,
    revocationPending: false,
    error: null,
  });
  await syncPushAgenda(userId, true);
}
export async function savePushPreferences(
  userId: string,
  preferences: PushPreferences,
) {
  const binding = getPushBinding();
  if (!binding || binding.ownerId !== userId || !binding.consented)
    throw new Error("Ative os avisos neste aparelho primeiro.");
  saveBinding({
    ...binding,
    preferences: pushPreferencesSchema.parse(preferences),
    dirty: true,
  });
  await syncPushAgenda(userId);
}
export async function disconnectPushForAccount(
  userId: string,
): Promise<{ remoteRevoked: boolean }> {
  const binding = getPushBinding();
  if (!binding || binding.ownerId !== userId) return { remoteRevoked: true };
  const remember = (patch: Partial<PushBinding>) => {
    try {
      updateBinding(binding.installationId, patch);
    } catch {
      cache = { ...(cache ?? binding), ...patch };
      // A full localStorage quota must not leave a persisted opt-in after cancellation.
      try {
        localStorage.removeItem(KEY);
        cacheRaw = null;
      } catch {
        /* Keep the in-memory opt-out if storage is blocked entirely. */
      }
      window.dispatchEvent(new Event(EVENT));
    }
  };
  remember({
    consented: false,
    revocationPending: true,
    dirty: false,
    error: null,
  });
  let browserStopped = true;
  try {
    if ("serviceWorker" in navigator) {
      const worker = await navigator.serviceWorker.getRegistration();
      const subscription = await worker?.pushManager.getSubscription();
      if (subscription && !(await subscription.unsubscribe()))
        browserStopped = false;
    }
  } catch {
    browserStopped = false;
  }
  try {
    parsePushResponse(
      revokedDeviceSchema,
      await request(userId, {
        method: "DELETE",
        body: JSON.stringify({ installationId: binding.installationId }),
      }),
    );
    remember({
      revocationPending: false,
      error: browserStopped
        ? null
        : "Agenda remota cancelada. Confira também a permissão nos ajustes do navegador.",
    });
    return { remoteRevoked: true };
  } catch {
    remember({
      error: browserStopped
        ? "Avisos desativados neste navegador; cancelamento remoto pendente. Entre novamente para concluir."
        : "Não foi possível confirmar o cancelamento. Bloqueie a permissão nos ajustes do navegador e tente novamente.",
    });
    return { remoteRevoked: false };
  }
}
export function startPushSync(userId: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let retryAfter = 0;
  let checking = false;
  const inspect = async () => {
    if (stopped || checking) return;
    checking = true;
    try {
      const binding = getPushBinding();
      const state = useAppStore.getState();
      if (!state.ready || !binding || binding.ownerId !== userId) return;
      if (binding.revocationPending) {
        if (Date.now() > retryAfter) {
          retryAfter = Date.now() + 60_000;
          void disconnectPushForAccount(userId);
        }
        return;
      }
      if (!binding.consented) return;
      if (!state.tutor || state.pets.length === 0) {
        void disconnectPushForAccount(userId);
        return;
      }
      const dirty =
        (await pushSourceSignature(binding.preferences)) !== binding.signature;
      if (stopped) return;
      if (dirty && !binding.dirty)
        updateBinding(binding.installationId, { dirty: true });
      if (
        !dirty &&
        !binding.dirty &&
        Date.parse(binding.validUntil ?? "") > Date.now() + 86_400_000
      )
        return;
      if (Date.now() < retryAfter) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        retryAfter = Date.now() + 60_000;
        void syncPushAgenda(userId)
          .catch(() => {})
          .finally(() => {
            if (!stopped) {
              timer = setTimeout(check, 60_000);
            }
          });
      }, 1000);
    } finally {
      checking = false;
    }
  };
  const check = () => {
    void inspect().catch(() => {
      /* A blocked local store must not prevent care edits; the panel can retry explicitly. */
    });
  };
  const online = () => {
    retryAfter = 0;
    check();
  };
  const unsubscribe = useAppStore.subscribe(check);
  window.addEventListener("online", online);
  document.addEventListener("visibilitychange", check);
  check();
  const heartbeat = setInterval(check, 60_000);
  return () => {
    stopped = true;
    clearTimeout(timer);
    clearInterval(heartbeat);
    unsubscribe();
    window.removeEventListener("online", online);
    document.removeEventListener("visibilitychange", check);
  };
}
