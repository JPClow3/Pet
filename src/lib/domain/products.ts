import { distanceKm, type Coordinates } from "./places";
import { lifeStage, petSize } from "./pet";
import { sizeLabels } from "./labels";
import type { Pet, Place, Product } from "./schema";

const stagePhrase: Record<string, string> = {
  filhote: "filhotes",
  adulto: "pets adultos",
  idoso: "pets idosos",
};

export type Recommendation = {
  product: Product;
  reasons: string[];
  score: number;
  partnerDistanceKm: number | null;
};

export function recommendProducts(input: {
  pet: Pet;
  products: Product[];
  places?: Place[];
  origin?: Coordinates | null;
  now?: Date;
  limit?: number;
}): Recommendation[] {
  const now = input.now ?? new Date();
  const size = petSize(input.pet.species, input.pet.weightKg);
  const stage = lifeStage(input.pet.birthDate, now);
  const places = input.places ?? [];
  const origin = input.origin ?? null;

  const scored = input.products
    .filter((product) => product.species.includes(input.pet.species))
    .map((product) => {
      const reasons: string[] = [];
      let score = 0;

      if (size && product.sizes.includes(size)) {
        score += 3;
        reasons.push(
          `Tamanho indicado para porte ${sizeLabels[size].toLowerCase()}${
            input.pet.weightKg ? ` (${input.pet.weightKg} kg)` : ""
          }`,
        );
      } else if (size && product.sizes.length > 0) {
        score -= 1;
      }

      if (stage && product.lifeStages.includes(stage)) {
        score += 2;
        reasons.push(`Indicado para ${stagePhrase[stage]}`);
      }

      const routineHit = product.routineTags.filter((tag) =>
        input.pet.routine.includes(tag),
      );
      if (routineHit.length > 0) {
        score += 2;
        reasons.push(`Combina com a rotina de ${routineHit.join(" e ")}`);
      }

      let partnerDistanceKm: number | null = null;
      const partnerPlace = places.find(
        (place) => place.id === product.partnerPlaceId,
      );
      if (partnerPlace && origin) {
        partnerDistanceKm = distanceKm(origin, partnerPlace);
        score += 1;
        reasons.push(
          `Disponível em ${partnerPlace.name}, a ${partnerDistanceKm} km`,
        );
      } else if (partnerPlace) {
        score += 1;
        reasons.push(`Disponível em ${partnerPlace.name}`);
      }

      return {
        product,
        reasons:
          reasons.length > 0
            ? reasons
            : ["Compatível com a espécie do seu pet"],
        score,
        partnerDistanceKm,
      };
    })
    .sort((a, b) => b.score - a.score);

  return input.limit ? scored.slice(0, input.limit) : scored;
}

export const ROUTINE_TAGS = [
  "passeio",
  "higiene",
  "enriquecimento",
  "alimentacao",
  "socializacao",
] as const;

export const routineTagLabels: Record<string, string> = {
  passeio: "passeio",
  higiene: "higiene",
  enriquecimento: "enriquecimento",
  alimentacao: "alimentação",
  socializacao: "socialização",
};
