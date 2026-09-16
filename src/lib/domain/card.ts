import { healthStatus } from "./health";
import { isValidDateKey } from "./dates";
import {
  publicPetCardSchema,
  type HealthRecord,
  type Pet,
  type PublicPetCard,
} from "./schema";

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += BASE64_ALPHABET[first >> 2];
    output += BASE64_ALPHABET[((first & 0x03) << 4) | ((second ?? 0) >> 4)];
    output +=
      second === undefined
        ? ""
        : BASE64_ALPHABET[((second & 0x0f) << 2) | ((third ?? 0) >> 6)];
    output += third === undefined ? "" : BASE64_ALPHABET[third & 0x3f];
  }
  return output.replace(/\+/g, "-").replace(/\//g, "_");
}

export function fromBase64Url(input: string): string | null {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of normalized) {
    const value = BASE64_ALPHABET.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  try {
    return new TextDecoder().decode(new Uint8Array(bytes));
  } catch {
    return null;
  }
}

export function buildPublicCard(input: {
  pet: Pet;
  records: HealthRecord[];
  city: string | null;
  now?: Date;
}): PublicPetCard {
  const { pet, records, city } = input;
  const now = input.now ?? new Date();
  const status = healthStatus(records, now);
  const card: PublicPetCard = {
    v: 1,
    name: pet.name,
    species: pet.species,
    breed: pet.card.shareBreed ? pet.breed : null,
    city: pet.card.shareCity ? city : null,
    lost: pet.lostMode.active
      ? { since: pet.lostMode.since, note: pet.lostMode.note }
      : null,
    health: null,
    contact: pet.card.contact,
  };

  if (pet.card.shareHealth && status.nextRecord) {
    card.health = {
      status:
        status.state === "vencido"
          ? "vencido"
          : status.state === "atencao"
            ? "atencao"
            : "em_dia",
      nextDueDate: isValidDateKey(status.nextRecord.nextDueDate)
        ? status.nextRecord.nextDueDate
        : null,
    };
  }

  return card;
}

export function encodePublicCard(card: PublicPetCard): string {
  return toBase64Url(JSON.stringify(card));
}

export function decodePublicCard(code: string): PublicPetCard | null {
  const json = fromBase64Url(code);
  if (!json) return null;
  try {
    const parsed = publicPetCardSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function publicCardPath(card: PublicPetCard): string {
  return `/p/${encodePublicCard(card)}`;
}
