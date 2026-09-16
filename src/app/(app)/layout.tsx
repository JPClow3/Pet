"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";
import { useEffect } from "react";

export default function AppLayout({ children }: LayoutProps<"/">) {
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
        <SkeletonScreen label="Abrindo o PetHub" />
      </AppShell>
    );
  }

  return <AppShell>{children as ReactNode}</AppShell>;
}
