import { verifiedCloudUser } from "@/lib/cloud/server-auth";
import { createPushHandlers } from "@/lib/push/handler";
import {
  publishPushAgenda,
  readPushDevices,
  revokePushDevice,
} from "@/lib/push/server";
export const dynamic = "force-dynamic";
export const { GET, PUT, DELETE } = createPushHandlers({
  currentUser: verifiedCloudUser,
  read: readPushDevices,
  publish: publishPushAgenda,
  revoke: revokePushDevice,
  configuration: () => ({
    enabled:
      process.env.PUSH_ENABLED === "true" &&
      Boolean(
        process.env.PUSH_VAPID_PUBLIC_KEY &&
        process.env.PUSH_VAPID_PRIVATE_KEY &&
        process.env.PUSH_VAPID_SUBJECT &&
        process.env.PUSH_DATABASE_URL,
      ),
    publicKey: process.env.PUSH_VAPID_PUBLIC_KEY ?? null,
  }),
});
