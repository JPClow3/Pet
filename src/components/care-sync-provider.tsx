"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getCloudClient } from "@/lib/cloud/client";
import { fetchCareSyncEvents } from "@/lib/cloud/collaboration-client";
import {
  mergeSharedMedicationEvents,
  publishMedicationDose,
  setCareSyncUser,
} from "@/lib/cloud/care-sync";
import { useAppStore } from "@/lib/store/app-store";
import { latestMedicationDoseEvents } from "@/lib/domain/medication";

export function CareSyncProvider() {
  const { data: session } = getCloudClient().useSession();
  const userId = session?.user?.emailVerified ? session.user.id : null;
  const ready = useAppStore((state) => state.ready);

  useEffect(() => {
    if (!ready || !userId) return;
    setCareSyncUser(userId);
    let cancelled = false;
    let running = false;
    let warned = false;
    async function refresh() {
      if (running || cancelled || !navigator.onLine) return;
      running = true;
      try {
        for (const pet of useAppStore.getState().pets) {
          const observedRecords = useAppStore.getState().records;
          const events = await fetchCareSyncEvents(userId!, pet.id);
          if (cancelled) return;
          // Send local/offline changes before applying remote winners, so a local
          // correction can use its expected event ID for compare-and-swap.
          for (const record of useAppStore
            .getState()
            .records.filter((item) => item.petId === pet.id)) {
            for (const dose of record.medication
              ? latestMedicationDoseEvents(record.medication)
              : []) {
              if (
                new Date(dose.recordedAt).getTime() <
                Date.now() - 7 * 86400000
              )
                continue;
              if (
                events.some(
                  (event) =>
                    event.payload.eventId === dose.id ||
                    `shared-${event.id}` === dose.id,
                )
              )
                continue;
              const shared = await publishMedicationDose(record, dose);
              if (cancelled) return;
              if (shared) events.push(shared);
            }
          }
          await useAppStore.setState((state) => {
            if (cancelled) return {};
            const merged = mergeSharedMedicationEvents(state.records, events);
            const records = merged.map((record, index) =>
              observedRecords.find((item) => item.id === record.id) ===
              state.records[index]
                ? record
                : state.records[index],
            );
            return records.some(
              (record, index) => record !== state.records[index],
            )
              ? { records }
              : {};
          });
        }
        warned = false;
      } catch (error) {
        if (!cancelled && !warned) {
          warned = true;
          toast.error(
            error instanceof Error
              ? error.message
              : "Não foi possível sincronizar os cuidados.",
          );
        }
      } finally {
        running = false;
      }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    const refreshOnFocus = () => void refresh();
    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("online", refreshOnFocus);
    return () => {
      cancelled = true;
      setCareSyncUser(null);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("online", refreshOnFocus);
    };
  }, [ready, userId]);
  return null;
}
