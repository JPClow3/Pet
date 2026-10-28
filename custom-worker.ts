// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- The generated module can be present or absent, so expect-error is not stable across builds.
// @ts-ignore OpenNext generates this module during cf:build; it may already exist locally.
import handler from "./.open-next/worker.js";
// Preserve the adapter's durable-object exports when its cache bindings are used.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- The generated module can be present or absent across builds.
// @ts-ignore OpenNext generates its named exports during cf:build.
export * from "./.open-next/worker.js";
import { dispatchPush, type PushEnvironment } from "./src/lib/push/dispatcher";
const worker = {
  fetch: handler.fetch,
  async scheduled(_controller: unknown, env: PushEnvironment) {
    await dispatchPush(env);
  },
};
export default worker;
