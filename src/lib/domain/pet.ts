import { parseISO } from "date-fns";
import { monthDiff } from "./dates";
import type { Pet, PetSize, Species } from "./schema";

export function petAge(birthDate: string | null, now: Date = new Date()) {
  if (!birthDate) return null;
  const months = monthDiff(parseISO(birthDate), now);
  if (months < 0) return null;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return {
    months,
    years,
    restMonths: rest,
    label: ageLabel(years, rest),
  };
}

function ageLabel(years: number, months: number): string {
  if (years === 0 && months === 0) return "recém-chegado";
  if (years === 0) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const yearLabel = `${years} ${years === 1 ? "ano" : "anos"}`;
  if (months === 0) return yearLabel;
  return `${yearLabel} e ${months} ${months === 1 ? "mês" : "meses"}`;
}

export function petSize(
  species: Species,
  weightKg: number | null,
): PetSize | null {
  if (!weightKg) return null;
  if (species === "gato") {
    if (weightKg < 3) return "pequeno";
    if (weightKg < 5) return "medio";
    return "grande";
  }
  if (weightKg < 6) return "mini";
  if (weightKg < 12) return "pequeno";
  if (weightKg < 25) return "medio";
  if (weightKg < 45) return "grande";
  return "gigante";
}

export function lifeStage(
  birthDate: string | null,
  now: Date = new Date(),
): "filhote" | "adulto" | "idoso" | null {
  const age = petAge(birthDate, now);
  if (!age) return null;
  if (age.months < 12) return "filhote";
  if (age.months >= 84) return "idoso";
  return "adulto";
}

export function petHeadline(pet: Pet, now: Date = new Date()): string {
  const age = petAge(pet.birthDate, now);
  const parts = [pet.breed ?? null, age?.label ?? null].filter(Boolean);
  if (parts.length === 0) return "Complete o perfil para ver a idade";
  return parts.join(" · ");
}

export function petCompletion(pet: Pet): {
  filled: number;
  total: number;
  missing: string[];
} {
  const checks: [string, boolean][] = [
    ["foto", Boolean(pet.photo)],
    ["data de nascimento", Boolean(pet.birthDate)],
    ["raça", Boolean(pet.breed)],
    ["peso", Boolean(pet.weightKg)],
    ["microchip", Boolean(pet.microchip)],
    ["contato na carteirinha", Boolean(pet.card.contact)],
  ];
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  return {
    filled: checks.length - missing.length,
    total: checks.length,
    missing,
  };
}
