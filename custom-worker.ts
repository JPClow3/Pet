// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- The generated module can be present or absent, so expect-error is not stable across builds.
// @ts-ignore OpenNext generates this module during cf:build; it may already exist locally.
import handler from "./.open-next/worker.js";
// Preserve the adapter's durable-object exports when its cache bindings are used.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- The generated module can be present or absent across builds.
// @ts-ignore OpenNext generates its named exports during cf:build.
export * from "./.open-next/worker.js";
import { dispatchPush, type PushEnvironment } from "./src/lib/push/dispatcher";

type ScheduledController = {
  scheduledTime: number;
  cron: string;
};

type ExecutionContext = {
  waitUntil: (promise: Promise<unknown>) => void;
};

const worker = {
  fetch: handler.fetch,
  async scheduled(
    controller: ScheduledController,
    env: PushEnvironment,
    ctx?: ExecutionContext,
  ) {
    const task = (async () => {
      try {
        const result = await dispatchPush(env);
        console.log(
          `[push-dispatcher] Scheduled cron "${controller?.cron ?? "trigger"}": attempted=${result.attempted} accepted=${result.accepted} failed=${result.failed} configured=${result.configured}`,
        );
      } catch (error) {
        console.error("[push-dispatcher] Scheduled push dispatch failed:", error);
      }
    })();

    if (ctx?.waitUntil) {
      ctx.waitUntil(task);
    } else {
      await task;
    }
  },
};

export default worker;
