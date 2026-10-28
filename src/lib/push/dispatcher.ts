import { neon } from "@neondatabase/serverless";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { pushPreferencesSchema, pushSubscriptionSchema } from "./schema";

export type PushEnvironment = {
  PUSH_ENABLED?: string;
  PUSH_DATABASE_URL?: string;
  PUSH_VAPID_PUBLIC_KEY?: string;
  PUSH_VAPID_PRIVATE_KEY?: string;
  PUSH_VAPID_SUBJECT?: string;
};

export type PushJob = {
  job_id: string;
  installation_id: string;
  lease_id: string;
  subscription: unknown;
  preferences?: unknown;
  occurrence_key: string;
  expires_at: string;
  attempts: number;
};

type Outcome = {
  status: "accepted" | "retry" | "failed" | "expired" | "suppressed";
  code: number | null;
  retryAt: string | null;
};

export function pushOutcome(
  code: number | null,
  attempts: number,
  expiresAt: string,
  now = new Date(),
  retryAfter: string | null = null,
): Outcome {
  if (code !== null && code >= 200 && code < 300)
    return { status: "accepted", code, retryAt: null };
  if (Date.parse(expiresAt) <= now.getTime())
    return { status: "expired", code, retryAt: null };
  if (attempts >= 5 || (code !== null && code !== 429 && code < 500))
    return { status: "failed", code, retryAt: null };
  const retryHeader = retryAfter
    ? /^\d+$/.test(retryAfter)
      ? Number(retryAfter) * 1000
      : Date.parse(retryAfter) - now.getTime()
    : 0;
  const delay = Math.max(
    60_000 * Math.min(15, 2 ** Math.max(0, attempts - 1)),
    Number.isFinite(retryHeader) ? retryHeader : 0,
  );
  const retry = now.getTime() + delay;
  return retry >= Date.parse(expiresAt)
    ? { status: "expired", code, retryAt: null }
    : { status: "retry", code, retryAt: new Date(retry).toISOString() };
}

export async function sendPushJob(
  job: PushJob,
  env: PushEnvironment,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<Outcome> {
  const remaining = Math.floor(
    (Date.parse(job.expires_at) - now.getTime()) / 1000,
  );
  if (remaining <= 0) return { status: "expired", code: null, retryAt: null };
  try {
    const subscription = pushSubscriptionSchema.parse(job.subscription);
    if (job.preferences) {
      const preferences = pushPreferencesSchema.parse(job.preferences);
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: preferences.timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(now);
      const time = `${parts.find((part) => part.type === "hour")?.value}:${parts.find((part) => part.type === "minute")?.value}`;
      const quiet =
        preferences.quietStart < preferences.quietEnd
          ? time >= preferences.quietStart && time < preferences.quietEnd
          : time >= preferences.quietStart || time < preferences.quietEnd;
      if (
        preferences.quietEnabled &&
        preferences.quietStart !== preferences.quietEnd &&
        quiet
      )
        return { status: "suppressed", code: null, retryAt: null };
    }
    const tag = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(job.occurrence_key),
        ),
      ),
    )
      .map((part) => part.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);
    const payload = await buildPushPayload(
      {
        data: {
          v: 1,
          title: "Zelupi",
          body: "Confira sua agenda de cuidados. O aviso não confirma nenhuma dose.",
          tag,
          url: "/reminders",
        },
        options: {
          ttl: Math.min(300, remaining),
          urgency: "normal",
          topic: tag,
        },
      },
      subscription,
      {
        subject: env.PUSH_VAPID_SUBJECT!,
        publicKey: env.PUSH_VAPID_PUBLIC_KEY!,
        privateKey: env.PUSH_VAPID_PRIVATE_KEY!,
      },
    );
    const response = await fetcher(subscription.endpoint, {
      ...payload,
      // Workers rejects redirect:"error" before sending. Manual never follows;
      // the 3xx response is classified as a permanent failure below.
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    return pushOutcome(
      response.status,
      job.attempts,
      job.expires_at,
      now,
      response.headers.get("Retry-After"),
    );
  } catch {
    return pushOutcome(null, job.attempts, job.expires_at, now);
  }
}

export type DispatchOptions = {
  maxBatches?: number;
  batchSize?: number;
  fetcher?: typeof fetch;
  now?: () => Date;
  executeOverride?: (query: unknown) => Promise<unknown>;
};

export type DispatchResult = {
  configured: boolean;
  attempted: number;
  accepted: number;
  failed: number;
  suppressed: number;
  retried: number;
  expired: number;
  batches: number;
};

export async function dispatchPush(
  env: PushEnvironment,
  options: DispatchOptions = {},
): Promise<DispatchResult> {
  const emptyResult = (configured: boolean): DispatchResult => ({
    configured,
    attempted: 0,
    accepted: 0,
    failed: 0,
    suppressed: 0,
    retried: 0,
    expired: 0,
    batches: 0,
  });

  if (
    env.PUSH_ENABLED !== "true" ||
    !env.PUSH_DATABASE_URL ||
    !env.PUSH_VAPID_PUBLIC_KEY ||
    !env.PUSH_VAPID_PRIVATE_KEY ||
    !env.PUSH_VAPID_SUBJECT
  ) {
    return emptyResult(false);
  }

  const maxBatches = Math.min(Math.max(options.maxBatches ?? 5, 1), 20);
  const batchSize = Math.min(Math.max(options.batchSize ?? 20, 1), 25);
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ? options.now() : new Date();

  const sql = neon(env.PUSH_DATABASE_URL);
  let execute: (query: unknown) => Promise<unknown>;

  if (options.executeOverride) {
    execute = options.executeOverride;
  } else {
    execute = async (query: unknown) => {
      const result = await sql.transaction([
        sql`set local role pethub_push_dispatcher`,
        query as ReturnType<typeof sql>,
      ]);
      return result[1];
    };
  }

  let attempted = 0;
  let accepted = 0;
  let failed = 0;
  let suppressed = 0;
  let retried = 0;
  let expired = 0;
  let batchCount = 0;

  for (let batch = 0; batch < maxBatches; batch++) {
    const jobs = (await execute(
      sql`select * from pethub.claim_push_jobs(${batchSize})`,
    )) as PushJob[];

    if (!Array.isArray(jobs) || jobs.length === 0) break;
    batchCount++;
    attempted += jobs.length;

    // Keep network concurrency bounded; a batch finishes within the lease window.
    for (let start = 0; start < jobs.length; start += 4) {
      await Promise.all(
        jobs.slice(start, start + 4).map(async (job) => {
          const valid = (await execute(
            sql`select pethub.push_claim_valid(${job.job_id}::uuid,${job.lease_id}::uuid) as valid, preferences from pethub.push_devices where installation_id=${job.installation_id}::uuid`,
          )) as Array<{ valid: boolean; preferences: unknown }>;

          if (!valid[0]?.valid) return;

          const outcome = await sendPushJob(
            { ...job, preferences: valid[0].preferences },
            env,
            fetcher,
            now,
          );

          if (outcome.status === "accepted") accepted++;
          else if (outcome.status === "failed") failed++;
          else if (outcome.status === "suppressed") suppressed++;
          else if (outcome.status === "retry") retried++;
          else if (outcome.status === "expired") expired++;

          await execute(
            sql`select pethub.finish_push_job(${job.job_id}::uuid,${job.lease_id}::uuid,${outcome.status},${outcome.code},${outcome.retryAt}::timestamptz)`,
          );
        }),
      );
    }

    if (jobs.length < batchSize) break;
  }

  return {
    configured: true,
    attempted,
    accepted,
    failed,
    suppressed,
    retried,
    expired,
    batches: batchCount,
  };
}
