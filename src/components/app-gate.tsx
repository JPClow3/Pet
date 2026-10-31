"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { PushSyncProvider } from "@/lib/push/provider";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

/** Sends visitors without a tutor profile to Welcome before the app renders. */
export function AppGate({ children }: { children: ReactNode }) {
  const ready = useHydrated();
  const hasTutor = useAppStore((state) => Boolean(state.tutor));
  const router = useRouter();

  useEffect(() => {
    if (ready && !hasTutor) {
      router.replace("/welcome");
    }
  }, [ready, hasTutor, router]);

  if (!ready || !hasTutor) {
    return (
      <AppShell>
        <SkeletonScreen label="Abrindo a Zelupi" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PushSyncProvider />
      {children}
    </AppShell>
  );
}
