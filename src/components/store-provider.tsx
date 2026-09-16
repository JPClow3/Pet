"use client";

import { useEffect, type ReactNode } from "react";

import { seedIfNeeded, useAppStore } from "@/lib/store/app-store";

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    let finished = false;

    const finish = () => {
      if (cancelled || finished) return;
      finished = true;
      seedIfNeeded();
      useAppStore.getState().sweepNotifications();
      useAppStore.getState().markReady();
    };

    if (useAppStore.persist.hasHydrated()) {
      finish();
      return;
    }

    const unsubscribe = useAppStore.persist.onFinishHydration(finish);
    const hydration = useAppStore.persist.rehydrate();
    void Promise.resolve(hydration).then(finish, finish);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
