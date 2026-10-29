import { z } from "zod";
import {
  id,
  isoDate,
  isoDateTime,
  medicationTimeSchema,
  speciesSchema,
  type HealthRecord,
  type Pet,
} from "./schema";

export const SITTER_PASS_TOKEN = /^s_[A-Za-z0-9_-]{43}$/;
export const PIN_REGEX = /^\d{4,6}$/;
export const MAX_SITTER_PASS_BYTES = 16384;

export const petCollaboratorRoleSchema = z.enum(["co_tutor", "cuidador"]);
export type PetCollaboratorRole = z.infer<typeof petCollaboratorRoleSchema>;

export const petCollaboratorStatusSchema = z.enum([
  "pending",
  "accepted",
  "revoked",
]);
export type PetCollaboratorStatus = z.infer<typeof petCollaboratorStatusSchema>;

export const petCollaboratorSchema = z.object({
  id,
  petId: id,
  petName: z.string().min(1).max(60),
  ownerUserId: z.string().min(1).max(200),
  collaboratorEmail: z.string().email().max(120),
  collaboratorUserId: z.string().max(200).nullable().default(null),
  collaboratorName: z.string().min(1).max(80),
  role: petCollaboratorRoleSchema,
  inviteCode: z.string().min(8).max(100),
  status: petCollaboratorStatusSchema,
  createdAt: isoDateTime,
  acceptedAt: isoDateTime.nullable().default(null),
  updatedAt: isoDateTime,
});
export type PetCollaborator = z.infer<typeof petCollaboratorSchema>;

export const careSyncEventTypeSchema = z.enum([
  "medication_dose",
  "meal",
  "care_note",
  "walk",
]);
export type CareSyncEventType = z.infer<typeof careSyncEventTypeSchema>;

export const careSyncEventSchema = z.object({
  id,
  petId: id,
  ownerUserId: z.string().min(1).max(200),
  actorUserId: z.string().max(200).nullable().default(null),
  actorName: z.string().min(1).max(80),
  actorRole: z.enum(["tutor", "co_tutor", "cuidador"]),
  eventType: careSyncEventTypeSchema,
  recordId: z.string().max(100).nullable().default(null),
  scheduleId: z.string().max(100).nullable().default(null),
  eventKey: z.string().min(1).max(200),
  status: z.enum([
    "given",
    "skipped",
    "missed",
    "unrecorded",
    "served",
    "completed",
  ]),
  payload: z.record(z.string(), z.unknown()).default({}),
  occurredAt: isoDateTime,
  createdAt: isoDateTime,
});
export type CareSyncEvent = z.infer<typeof careSyncEventSchema>;

export const emergencyContactSchema = z.object({
  tutorName: z.string().min(1).max(80),
  tutorPhone: z.string().min(8).max(30),
  tutorWhatsapp: z.string().max(30).nullable().optional(),
  emergencyVetName: z.string().min(1).max(80),
  emergencyVetPhone: z.string().min(8).max(30),
  emergencyClinicName: z.string().max(100).nullable().optional(),
  emergencyAddress: z.string().max(200).nullable().optional(),
  is24h: z.boolean().default(true),
});
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;

export const feedingScheduleItemSchema = z.object({
  id,
  time: medicationTimeSchema,
  description: z.string().min(1).max(120),
  amount: z.string().min(1).max(60),
  notes: z.string().max(200).nullable().optional(),
});
export type FeedingScheduleItem = z.infer<typeof feedingScheduleItemSchema>;

export const sitterMedicationItemSchema = z.object({
  recordId: z.string().min(1),
  scheduleId: z.string().min(1),
  name: z.string().min(1).max(80),
  amount: z.string().min(1).max(30),
  unit: z.string().min(1).max(30),
  times: z.array(medicationTimeSchema),
  instructions: z.string().max(600),
  startsOn: isoDate,
  endsOn: isoDate.nullable(),
  active: z.boolean(),
});
export type SitterMedicationItem = z.infer<typeof sitterMedicationItemSchema>;

export const sitterViewDataSchema = z.object({
  v: z.literal(1),
  generatedAt: isoDateTime,
  pet: z.object({
    id,
    name: z.string().min(1).max(60),
    species: speciesSchema,
    breed: z.string().max(60).nullable(),
    birthDate: isoDate.nullable(),
    photo: z.string().nullable(),
    color: z.string().max(40).nullable(),
  }),
  allergies: z.array(z.string().min(1).max(80)).max(20),
  specialCareNotes: z.string().max(800).nullable(),
  emergencyContact: emergencyContactSchema,
  feedingSchedule: z.array(feedingScheduleItemSchema).max(10),
  medicationSchedule: z.array(sitterMedicationItemSchema).max(20),
});
export type SitterViewData = z.infer<typeof sitterViewDataSchema>;

export const petSitterPassSchema = z.object({
  id: z.string().uuid(),
  petId: id,
  ownerUserId: z.string().min(1).max(200),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  hasPin: z.boolean(),
  sitterName: z.string().max(80).nullable(),
  expiresAt: isoDateTime,
  revokedAt: isoDateTime.nullable(),
  passData: sitterViewDataSchema,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type PetSitterPass = z.infer<typeof petSitterPassSchema>;

/** Create secure cryptographic random token for caregiver pass */
export function createSitterPassToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `s_${btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")}`;
}

/** SHA-256 hash of the sitter pass token */
export async function hashSitterPassToken(token: string): Promise<string> {
  if (!SITTER_PASS_TOKEN.test(token))
    throw new Error("Token de cuidador inválido");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

const PIN_ITERATIONS = 100_000;
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

async function derivePin(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: new Uint8Array(salt),
          iterations: PIN_ITERATIONS,
        },
        key,
        256,
      ),
    ),
  );
}

/** Salted, slow hash; the online attempt budget is enforced in Postgres. */
export async function hashSitterPin(pin: string): Promise<string> {
  if (!PIN_REGEX.test(pin)) {
    throw new Error("O PIN deve conter de 4 a 6 dígitos numéricos.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256:${PIN_ITERATIONS}:${hex(salt)}:${await derivePin(pin, salt)}`;
}

/** Verify user provided PIN against stored hash */
export async function verifySitterPin(
  pin: string,
  expectedHash: string,
): Promise<boolean> {
  if (!PIN_REGEX.test(pin)) return false;
  let computed: string;
  let expected: string;
  if (/^[a-f0-9]{64}$/.test(expectedHash)) {
    // Existing passes remain usable until the tutor replaces their link.
    computed = hex(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(`zelupi_sitter_pin:${pin}`),
        ),
      ),
    );
    expected = expectedHash;
  } else {
    const match = /^pbkdf2-sha256:100000:([a-f0-9]{32}):([a-f0-9]{64})$/.exec(
      expectedHash,
    );
    if (!match) return false;
    const salt = Uint8Array.from(match[1].match(/../g)!, (byte) =>
      parseInt(byte, 16),
    );
    computed = await derivePin(pin, salt);
    expected = match[2];
  }
  let difference = 0;
  for (let i = 0; i < expected.length; i++)
    difference |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

/**
 * Sanitizes and extracts ONLY the caregiver-relevant fields from pet and records.
 * STRICT PRIVACY GUARANTEE: Never exposes private diaries, clinical histories,
 * exam PDFs/attachments, microchip numbers, or financial documents.
 */
export function sanitizeForSitterView(options: {
  pet: Pet;
  records: HealthRecord[];
  allergies?: string[];
  specialCareNotes?: string | null;
  emergencyContact: EmergencyContact;
  feedingSchedule?: FeedingScheduleItem[];
  now?: Date;
}): SitterViewData {
  const {
    pet,
    records,
    allergies = [],
    specialCareNotes = null,
    emergencyContact,
    feedingSchedule = [],
    now = new Date(),
  } = options;

  // Extract active medications only
  const activeMedications: SitterMedicationItem[] = [];
  for (const record of records) {
    if (record.type === "medicamento" && record.medication?.schedules) {
      for (const schedule of record.medication.schedules) {
        // Active if not closed or closed in future
        const isActive =
          !schedule.closedAt || new Date(schedule.closedAt) > now;
        if (isActive) {
          activeMedications.push({
            recordId: record.id,
            scheduleId: schedule.id,
            name: record.title,
            amount: schedule.amount,
            unit: schedule.unit,
            times: schedule.times,
            instructions: schedule.instructions,
            startsOn: schedule.startsOn,
            endsOn: schedule.endsOn,
            active: true,
          });
        }
      }
    }
  }

  const viewData: SitterViewData = {
    v: 1,
    generatedAt: now.toISOString(),
    pet: {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      birthDate: pet.birthDate,
      photo: pet.photo,
      color: pet.color,
    },
    allergies: allergies.filter(Boolean).slice(0, 20),
    specialCareNotes: specialCareNotes?.trim() || null,
    emergencyContact,
    feedingSchedule: feedingSchedule.slice(0, 10),
    medicationSchedule: activeMedications.slice(0, 20),
  };

  return sitterViewDataSchema.parse(viewData);
}
