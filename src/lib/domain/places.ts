import type { Place, PlaceAttribute, PlaceCategory, Review } from "./schema";

export type Coordinates = { lat: number; lng: number };

export function distanceKm(from: Coordinates, to: Coordinates): number {
  const earthRadius = 6371;
  const latDelta = ((to.lat - from.lat) * Math.PI) / 180;
  const lngDelta = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(lngDelta / 2) ** 2;
  return Number(
    (2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(a)))).toFixed(1),
  );
}

export type PlaceWithDistance = Place & { distanceKm: number };

export type PlaceFilters = {
  categories: PlaceCategory[];
  attributes: PlaceAttribute[];
  query: string;
  verifiedOnly: boolean;
};

export const emptyFilters: PlaceFilters = {
  categories: [],
  attributes: [],
  query: "",
  verifiedOnly: false,
};

export function filterPlaces(
  places: Place[],
  filters: PlaceFilters,
  origin: Coordinates,
): PlaceWithDistance[] {
  const query = filters.query.trim().toLowerCase();
  return places
    .filter((place) => {
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(place.category)
      ) {
        return false;
      }
      if (filters.verifiedOnly && !place.verified) return false;
      if (
        filters.attributes.length > 0 &&
        !filters.attributes.every((attribute) =>
          place.attributes.includes(attribute),
        )
      ) {
        return false;
      }
      if (query.length > 0) {
        const haystack =
          `${place.name} ${place.neighborhood} ${place.address}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .map((place) => ({ ...place, distanceKm: distanceKm(origin, place) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export type CriterionScore = {
  attribute: PlaceAttribute;
  positive: number;
  total: number;
  positiveRatio: number;
};

export function criterionScores(reviews: Review[]): CriterionScore[] {
  const counts = new Map<PlaceAttribute, { positive: number; total: number }>();
  for (const review of reviews) {
    for (const attribute of review.criteria) {
      const entry = counts.get(attribute) ?? { positive: 0, total: 0 };
      entry.positive += 1;
      entry.total += 1;
      counts.set(attribute, entry);
    }
  }
  return [...counts.entries()]
    .map(([attribute, entry]) => ({
      attribute,
      positive: entry.positive,
      total: entry.total,
      positiveRatio: entry.total === 0 ? 0 : entry.positive / entry.total,
    }))
    .sort((a, b) => b.positiveRatio - a.positiveRatio);
}

export function placeRating(reviews: Review[]): {
  average: number;
  total: number;
} {
  if (reviews.length === 0) return { average: 0, total: 0 };
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return {
    average: Number((sum / reviews.length).toFixed(1)),
    total: reviews.length,
  };
}

export function reviewsForPlace(reviews: Review[], placeId: string): Review[] {
  return reviews
    .filter((review) => review.placeId === placeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function directionsUrl(place: Place): string {
  const query = encodeURIComponent(
    `${place.name}, ${place.address}, ${place.city}`,
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
