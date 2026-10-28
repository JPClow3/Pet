"use client";
import { useEffect, useSyncExternalStore } from "react";
import { getCloudClient } from "@/lib/cloud/client";
import {
  disconnectPushForAccount,
  getPushBinding,
  startPushSync,
  subscribePushBinding,
  emptyPushBinding,
} from "./client";
export function PushSyncProvider() {
  const binding = useSyncExternalStore(
    subscribePushBinding,
    getPushBinding,
    emptyPushBinding,
  );
  return binding ? <BoundPushSync /> : null;
}
function BoundPushSync() {
  const { data: session, isPending } = getCloudClient().useSession();
  const userId = session?.user?.emailVerified ? session.user.id : null;
  useEffect(() => {
    // A missing session can mean offline or an expired cookie, not a request to opt out.
    // Explicit sign-out cancels first; a confirmed account change also stops the old binding.
    if (isPending || !userId) return;
    const binding = getPushBinding();
    if (binding?.consented && binding.ownerId !== userId) {
      void disconnectPushForAccount(binding.ownerId);
      return;
    }
    return startPushSync(userId);
  }, [userId, isPending]);
  return null;
}
