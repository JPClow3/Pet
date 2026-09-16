"use client";

import { useMemo } from "react";

import { buildReminders, type ReminderItem } from "@/lib/domain/reminders";
import type { HealthRecord, Pet } from "@/lib/domain/schema";
import { seedIfNeeded, useAppStore } from "./app-store";

export function useHydrated(): boolean {
  return useAppStore((state) => state.ready);
}

export function useActivePet(): Pet | null {
  const pets = useAppStore((state) => state.pets);
  const activePetId = useAppStore((state) => state.activePetId);
  return useMemo(
    () => pets.find((pet) => pet.id === activePetId) ?? pets[0] ?? null,
    [pets, activePetId],
  );
}

export function usePetRecords(petId: string | null): HealthRecord[] {
  const records = useAppStore((state) => state.records);
  return useMemo(
    () => (petId ? records.filter((record) => record.petId === petId) : []),
    [records, petId],
  );
}

export function useReminderItems(): ReminderItem[] {
  const pets = useAppStore((state) => state.pets);
  const records = useAppStore((state) => state.records);
  const reminders = useAppStore((state) => state.reminders);
  const snoozes = useAppStore((state) => state.snoozes);
  return useMemo(
    () => buildReminders({ pets, records, reminders, snoozes }),
    [pets, records, reminders, snoozes],
  );
}

export function useTutorName(): string {
  const tutor = useAppStore((state) => state.tutor);
  return tutor?.name ?? "";
}

export { seedIfNeeded };
