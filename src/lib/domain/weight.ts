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
