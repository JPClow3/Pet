import * as Sentry from "@sentry/nextjs";
import { telemetryPrivacyHooks } from "./src/lib/telemetry-privacy";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? "production",
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    integrations: [
      Sentry.requestDataIntegration({
        include: { data: false, cookies: false },
      }),
    ],
    ...telemetryPrivacyHooks,
  });
}
