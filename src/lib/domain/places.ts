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

const kmFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

/** "1,6 km": distances follow pt-BR decimal notation. */
export function formatKm(km: number): string {
  return `${kmFormatter.format(km)} km`;
}

// Numbers and hours that older builds shipped on fictional demo places.
const LEGACY_DEMO_NUMBERS = new Set([
  "1130620100",
  "5511990000100",
  "1130810240",
  "5511990000240",
  "1130640310",
  "5511990000310",
  "1130610450",
  "5511990000450",
]);
const LEGACY_DEMO_HOURS = new Set([
  "Plantão 24h todos os dias",
  "Emergência 24h",
]);

function isLegacyDemoNumber(value?: string | null): boolean {
  return LEGACY_DEMO_NUMBERS.has(normalizePhoneDigits(value));
}

/**
 * Demo catalogue entries are fictional: they never claim to be verified or
 * open, never advertise emergency service and never carry callable numbers.
 * A demo place the tutor gave their own number to becomes their place.
 */
export function sanitizeSeededPlace(place: Place): Place {
  if (!place.seeded) return place;
  const phone = isLegacyDemoNumber(place.phone) ? null : (place.phone ?? null);
  const whatsapp = isLegacyDemoNumber(place.whatsapp)
    ? null
    : (place.whatsapp ?? null);
  if (phone || whatsapp) {
    return { ...place, phone, whatsapp, seeded: false, source: "local" };
  }
  return {
    ...place,
    verified: false,
    openNow: null,
    attributes: place.attributes.filter(
      (attribute) => attribute !== "emergencia_24h",
    ),
    phone: null,
    whatsapp: null,
    openingHours:
      place.openingHours && LEGACY_DEMO_HOURS.has(place.openingHours)
        ? null
        : (place.openingHours ?? null),
  };
}

/** Only places the tutor saved (or imported) may expose call/WhatsApp actions. */
export function placeContactLinks(
  place: Pick<Place, "seeded" | "phone" | "whatsapp">,
  message?: string,
): { callHref: string | null; waHref: string | null } {
  if (place.seeded) return { callHref: null, waHref: null };
  return {
    callHref: phoneCallUrl(place.phone),
    waHref: whatsappUrl(place.whatsapp ?? place.phone, message),
  };
}

export type PlaceFilters = {
  categories: PlaceCategory[];
  attributes: PlaceAttribute[];
  query: string;
  verifiedOnly: boolean;
  emergencyOnly?: boolean;
  favoritesOnly?: boolean;
  trustedOnly?: boolean;
};

export const emptyFilters: PlaceFilters = {
  categories: [],
  attributes: [],
  query: "",
  verifiedOnly: false,
  emergencyOnly: false,
  favoritesOnly: false,
  trustedOnly: false,
};

export function isEmergency24hPlace(place: Place): boolean {
  if (place.seeded) return false;
  if (place.attributes.includes("emergencia_24h")) return true;
  if (place.openingHours && /24\s*h|24\/7/i.test(place.openingHours)) {
    return true;
  }
  return false;
}

export function normalizePhoneDigits(raw?: string | null): string {
  if (!raw) return "";
  return raw.replace(/\D+/g, "");
}

export function phoneCallUrl(phone?: string | null): string | null {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 3) return null;
  const trimmed = phone?.trim() ?? "";
  if (trimmed.startsWith("+")) {
    return `tel:+${digits}`;
  }
  return `tel:${digits}`;
}

export function whatsappUrl(
  whatsappOrPhone?: string | null,
  message?: string,
): string | null {
  const digits = normalizePhoneDigits(whatsappOrPhone);
  if (digits.length < 10) return null;
  const fullNumber =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  const base = `https://wa.me/${fullNumber}`;
  if (!message || !message.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

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
      if (filters.emergencyOnly && !isEmergency24hPlace(place)) return false;
      if (filters.favoritesOnly && !place.favorite) return false;
      if (filters.trustedOnly && !place.favorite && place.seeded) return false;
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
          `${place.name} ${place.neighborhood} ${place.address} ${place.notes ?? ""} ${place.phone ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .map((place) => ({ ...place, distanceKm: distanceKm(origin, place) }))
    .sort((a, b) => {
      if (filters.emergencyOnly || filters.favoritesOnly || filters.trustedOnly) {
        const favDiff = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite));
        if (favDiff !== 0) return favDiff;
        const emDiff =
          Number(isEmergency24hPlace(b)) - Number(isEmergency24hPlace(a));
        if (emDiff !== 0) return emDiff;
      }
      return a.distanceKm - b.distanceKm;
    });
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
  const parts = [place.name, place.address, place.neighborhood, place.city]
    .map((part) => part?.trim())
    .filter(Boolean);
  if (parts.length > 0 && place.address.trim().length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}, ${place.city}`)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.lat},${place.lng}`)}`;
}

export const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

export function buildOverpassQuery(
  center: Coordinates,
  radiusMeters = 5000,
): string {
  const r = Math.max(500, Math.min(25000, Math.round(radiusMeters)));
  const lat = Number(center.lat.toFixed(5));
  const lng = Number(center.lng.toFixed(5));
  return `[out:json][timeout:12];
(
  nwr["amenity"="veterinary"](around:${r},${lat},${lng});
  nwr["healthcare"="veterinary"](around:${r},${lat},${lng});
  nwr["shop"="pet"](around:${r},${lat},${lng});
  nwr["amenity"="pharmacy"]["veterinary"="yes"](around:${r},${lat},${lng});
);
out center 40;`;
}

type OverpassElement = {
  type?: string;
  id?: number | string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string | undefined>;
};

export function parseOverpassResponse(
  payload: unknown,
  defaultCity = "São Paulo",
): Place[] {
  if (!payload || typeof payload !== "object") return [];
  const elements = (payload as { elements?: unknown }).elements;
  if (!Array.isArray(elements)) return [];

  const nowIso = new Date().toISOString();
  const seen = new Set<string>();
  const results: Place[] = [];

  for (const raw of elements as OverpassElement[]) {
    if (!raw || typeof raw !== "object") continue;
    const tags = raw.tags ?? {};
    const rawName = (tags.name ?? tags["name:pt"] ?? "").trim();
    if (!rawName) continue;

    const lat =
      typeof raw.lat === "number"
        ? raw.lat
        : typeof raw.center?.lat === "number"
          ? raw.center.lat
          : null;
    const lng =
      typeof raw.lon === "number"
        ? raw.lon
        : typeof raw.center?.lon === "number"
          ? raw.center.lon
          : null;
    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    const osmType = raw.type ?? "node";
    const osmRawId = String(raw.id ?? `${lat.toFixed(4)}-${lng.toFixed(4)}`);
    const osmId = `${osmType}/${osmRawId}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);

    let category: PlaceCategory = "veterinario";
    if (tags.amenity === "pharmacy") {
      category = "farmacia";
    } else if (tags.shop === "pet") {
      category = "pet_shop";
    } else if (tags.shop === "pet_grooming") {
      category = "banho_tosa";
    } else if (tags.leisure === "park" || tags.leisure === "dog_park") {
      category = "parque";
    }

    const openingHours = (tags.opening_hours ?? "").trim() || null;
    const is24h =
      openingHours === "24/7" ||
      Boolean(openingHours && /24\s*h/i.test(openingHours)) ||
      tags.emergency === "yes" ||
      /24\s*h|24\s*horas|emerg[eê]ncia|hospital\s+veterin/i.test(rawName);

    const attributes: PlaceAttribute[] = [];
    if (is24h) attributes.push("emergencia_24h");
    if (category === "pet_shop" || category === "parque") {
      attributes.push("aceita_caes");
    }

    const street = (tags["addr:street"] ?? "").trim();
    const number = (tags["addr:housenumber"] ?? "").trim();
    const address =
      [street, number].filter(Boolean).join(", ").slice(0, 160) ||
      (tags["addr:full"] ?? "Endereço não informado").slice(0, 160);

    const neighborhood = (
      tags["addr:suburb"] ??
      tags["addr:neighbourhood"] ??
      tags["addr:district"] ??
      "Região próxima"
    )
      .trim()
      .slice(0, 60);

    const city = (tags["addr:city"] ?? defaultCity).trim().slice(0, 60) || defaultCity;
    const phone =
      (
        tags["contact:phone"] ??
        tags.phone ??
        tags["contact:mobile"] ??
        ""
      )
        .trim()
        .slice(0, 40) || null;
    const whatsapp =
      (tags["contact:whatsapp"] ?? tags.whatsapp ?? "").trim().slice(0, 40) ||
      null;

    results.push({
      id: `osm-${osmType}-${osmRawId}`,
      name: rawName.slice(0, 80),
      category,
      address,
      neighborhood,
      city,
      lat,
      lng,
      attributes,
      priceLevel: null,
      verified: false,
      openNow: is24h ? true : null,
      seeded: false,
      phone,
      whatsapp,
      favorite: false,
      notes: openingHours
        ? `Dados colaborativos do OpenStreetMap · Horário: ${openingHours}`
        : "Dados colaborativos do OpenStreetMap. Confirme por telefone antes de se deslocar.",
      source: "osm",
      osmId,
      openingHours,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  return results;
}

export async function fetchNearbyOsmPlaces(options: {
  origin: Coordinates;
  radiusMeters?: number;
  city?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<Place[]> {
  const fetcher = options.fetchImpl ?? fetch;
  const query = buildOverpassQuery(options.origin, options.radiusMeters ?? 5000);
  const response = await fetcher(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(
      `Não foi possível buscar clínicas agora (erro ${response.status}). Tente de novo em instantes.`,
    );
  }
  const payload = await response.json();
  return parseOverpassResponse(payload, options.city ?? "São Paulo");
}
