import { todayKey } from "./dates";
import type { DiaryEntry, HealthRecord, Pet } from "./schema";

type WeightState = {
  pets: Pet[];
  records: HealthRecord[];
  diary: DiaryEntry[];
};

export function weightTimestamp(state: WeightState, petId: string): string {
  // Keep edits ordered even when two saves happen in the same millisecond.
  const pet = state.pets.find((entry) => entry.id === petId);
  const times = [
    pet?.weightBaseline?.updatedAt,
    ...state.records
      .filter((entry) => entry.petId === petId)
      .map((entry) => entry.weightUpdatedAt ?? entry.createdAt),
    ...state.diary
      .filter((entry) => entry.petId === petId)
      .map((entry) => entry.weightUpdatedAt ?? entry.createdAt),
  ];
  const latest = times.reduce<number>(
    (result, value) => (value ? Math.max(result, Date.parse(value)) : result),
    Date.now() - 1,
  );
  return new Date(latest + 1).toISOString();
}

export function weightBaseline(
  pet: Pet,
  state: WeightState,
): Pet["weightBaseline"] {
  if (pet.weightBaseline !== undefined) return pet.weightBaseline;
  // Legacy versions copied measurements into weightKg without retaining a baseline.
  const hasMeasurements = [...state.records, ...state.diary].some(
    (entry) => entry.petId === pet.id && entry.weightKg !== null,
  );
  const previous = state.pets.find((entry) => entry.id === pet.id) ?? pet;
  return previous.weightKg !== null && !hasMeasurements
    ? {
        weightKg: previous.weightKg,
        date: todayKey(new Date(previous.updatedAt)),
        updatedAt: previous.updatedAt,
      }
    : null;
}

export function petWeightMeasurements(
  pet: Pet,
  records: HealthRecord[],
  diary: DiaryEntry[],
) {
  const baseline = weightBaseline(pet, { pets: [pet], records, diary });
  const measures = [...records, ...diary]
    .filter((entry) => entry.petId === pet.id && entry.weightKg !== null)
    .map((entry) => ({
      date: entry.date,
      weightKg: entry.weightKg,
      at: entry.weightUpdatedAt ?? entry.createdAt,
    }));
  if (baseline)
    measures.push({
      date: baseline.date,
      weightKg: baseline.weightKg,
      at: baseline.updatedAt,
    });
  return measures.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || Date.parse(a.at) - Date.parse(b.at),
  );
}

export function reconcileWeights<T extends Partial<WeightState>>(
  state: WeightState,
  patch: T,
  petIds: string[],
): T & { pets: Pet[] } {
  const affected = new Set(petIds);
  const updated = { ...state, ...patch };
  return {
    ...patch,
    pets: updated.pets.map((pet) => {
      if (!affected.has(pet.id)) return pet;
      const baseline = weightBaseline(pet, state);
      const measures = petWeightMeasurements(
        { ...pet, weightBaseline: baseline },
        updated.records,
        updated.diary,
      );
      return {
        ...pet,
        weightBaseline: baseline,
        weightKg: measures.at(-1)?.weightKg ?? null,
      };
    }),
  };
}

export type WeightAlert = {
  type: "loss" | "gain";
  percentage: number;
  deltaKg: number;
  days: number;
  previousDate: string;
  currentDate: string;
};

export function detectSuddenWeightChange(
  measurements: { date: string; weightKg: number }[],
  thresholdPercent = 5,
  maxDays = 90,
): WeightAlert | null {
  if (measurements.length < 2) return null;
  // Deduplicate points on the same date by keeping the latest, then sort chronologically
  const byDate = new Map<string, number>();
  for (const m of measurements) {
    if (m.weightKg > 0) {
      byDate.set(m.date, m.weightKg);
    }
  }
  const points = Array.from(byDate.entries())
    .map(([date, weightKg]) => ({ date, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length < 2) return null;

  // Examine consecutive points from newest to oldest
  for (let i = points.length - 1; i >= 1; i--) {
    const current = points[i];
    const previous = points[i - 1];
    if (previous.weightKg <= 0 || current.weightKg <= 0) continue;
    const daysDiff = Math.abs(
      Math.round(
        (Date.parse(`${current.date}T12:00:00Z`) -
          Date.parse(`${previous.date}T12:00:00Z`)) /
          86400000,
      ),
    );
    if (daysDiff >= 1 && daysDiff <= maxDays) {
      const deltaKg =
        Math.round((current.weightKg - previous.weightKg) * 10) / 10;
      const percentage =
        Math.round(
          (Math.abs(current.weightKg - previous.weightKg) /
            previous.weightKg) *
            100 *
            10,
        ) / 10;
      if (percentage >= thresholdPercent && Math.abs(deltaKg) >= 0.2) {
        return {
          type: deltaKg < 0 ? "loss" : "gain",
          percentage,
          deltaKg,
          days: daysDiff,
          previousDate: previous.date,
          currentDate: current.date,
        };
      }
    }
  }
  return null;
}

