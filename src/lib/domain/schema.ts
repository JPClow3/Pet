import { z } from "zod";

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD");

export const isoDateTime = z.string().min(1);

export const id = z.string().min(1);

export const speciesSchema = z.enum(["cao", "gato", "outro"]);
export type Species = z.infer<typeof speciesSchema>;

export const sexSchema = z.enum(["macho", "femea", "nao_informado"]);
export type Sex = z.infer<typeof sexSchema>;

export const petSizeSchema = z.enum([
  "mini",
  "pequeno",
  "medio",
  "grande",
  "gigante",
]);
export type PetSize = z.infer<typeof petSizeSchema>;

export const focusAreaSchema = z.enum([
  "saude",
  "rotina",
  "lugares",
  "comunidade",
]);
export type FocusArea = z.infer<typeof focusAreaSchema>;

export const lostModeSchema = z.object({
  active: z.boolean(),
  since: isoDate.nullable(),
  note: z.string().max(280).nullable(),
});
export type LostMode = z.infer<typeof lostModeSchema>;

export const petCardSettingsSchema = z.object({
  shareBreed: z.boolean(),
  shareCity: z.boolean(),
  shareHealth: z.boolean(),
  contact: z.string().max(120).nullable(),
});
export type PetCardSettings = z.infer<typeof petCardSettingsSchema>;

export const petSchema = z.object({
  id,
  name: z.string().min(1).max(60),
  species: speciesSchema,
  breed: z.string().max(60).nullable(),
  sex: sexSchema,
  birthDate: isoDate.nullable(),
  weightKg: z.number().positive().max(120).nullable(),
  photo: z.string().nullable(),
  color: z.string().max(40).nullable(),
  microchip: z.string().max(40).nullable(),
  notes: z.string().max(600).nullable(),
  routine: z.array(z.string().max(40)).max(12),
  card: petCardSettingsSchema,
  lostMode: lostModeSchema,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type Pet = z.infer<typeof petSchema>;

export const healthRecordTypeSchema = z.enum([
  "vacina",
  "vermifugo",
  "antiparasitario",
  "medicamento",
  "consulta",
  "exame",
  "peso",
  "observacao",
]);
export type HealthRecordType = z.infer<typeof healthRecordTypeSchema>;

export const healthRecordSchema = z.object({
  id,
  petId: id,
  type: healthRecordTypeSchema,
  title: z.string().min(1).max(80),
  date: isoDate,
  nextDueDate: isoDate.nullable(),
  leadDays: z.number().int().min(0).max(365),
  recurrenceMonths: z.number().int().min(0).max(60).nullable(),
  professional: z.string().max(80).nullable(),
  notes: z.string().max(600).nullable(),
  attachmentName: z.string().max(120).nullable(),
  attachmentData: z.string().nullable(),
  weightKg: z.number().positive().max(120).nullable(),
  completedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
});
export type HealthRecord = z.infer<typeof healthRecordSchema>;

export const reminderSchema = z.object({
  id,
  petId: id,
  title: z.string().min(1).max(80),
  kind: z.enum(["saude", "rotina", "outro"]),
  dueDate: isoDate,
  leadDays: z.number().int().min(0).max(365),
  notes: z.string().max(400).nullable(),
  done: z.boolean(),
  createdAt: isoDateTime,
});
export type Reminder = z.infer<typeof reminderSchema>;

export const diaryEntrySchema = z.object({
  id,
  petId: id,
  date: isoDate,
  text: z.string().min(1).max(800),
  photo: z.string().nullable(),
  tags: z.array(z.string().max(30)).max(8),
  place: z.string().max(80).nullable(),
  weightKg: z.number().positive().max(120).nullable(),
  visibility: z.enum(["privado", "publico"]),
  createdAt: isoDateTime,
});
export type DiaryEntry = z.infer<typeof diaryEntrySchema>;

export const placeCategorySchema = z.enum([
  "parque",
  "restaurante",
  "veterinario",
  "banho_tosa",
  "hospedagem",
  "passeador_adestrador",
]);
export type PlaceCategory = z.infer<typeof placeCategorySchema>;

export const placeAttributeSchema = z.enum([
  "aceita_caes",
  "area_cercada",
  "agua_disponivel",
  "sombra",
  "area_externa",
  "aceita_raca_grande",
  "equipe_paciente",
  "ruido_alto",
  "emergencia_24h",
  "portoes_fechados",
]);
export type PlaceAttribute = z.infer<typeof placeAttributeSchema>;

export const placeSchema = z.object({
  id,
  name: z.string().min(1).max(80),
  category: placeCategorySchema,
  address: z.string().max(160),
  neighborhood: z.string().max(60),
  city: z.string().max(60),
  lat: z.number(),
  lng: z.number(),
  attributes: z.array(placeAttributeSchema),
  priceLevel: z.number().int().min(0).max(4).nullable(),
  verified: z.boolean(),
  openNow: z.boolean().nullable(),
  seeded: z.boolean(),
});
export type Place = z.infer<typeof placeSchema>;

export const reviewSchema = z.object({
  id,
  placeId: id,
  authorName: z.string().min(1).max(60),
  criteria: z.array(placeAttributeSchema),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(600).nullable(),
  createdAt: isoDateTime,
});
export type Review = z.infer<typeof reviewSchema>;

export const postTypeSchema = z.enum([
  "pergunta",
  "recomendacao",
  "diario_publico",
  "perdido_encontrado",
  "evento",
  "dica",
]);
export type PostType = z.infer<typeof postTypeSchema>;

export const postSchema = z.object({
  id,
  authorName: z.string().min(1).max(60),
  authorId: z.string().min(1),
  petName: z.string().max(60).nullable(),
  type: postTypeSchema,
  groupId: id.nullable(),
  title: z.string().min(1).max(120),
  body: z.string().max(1200),
  city: z.string().max(60).nullable(),
  createdAt: isoDateTime,
  helpfulCount: z.number().int().min(0),
  reported: z.boolean(),
  hidden: z.boolean(),
});
export type Post = z.infer<typeof postSchema>;

export const commentSchema = z.object({
  id,
  postId: id,
  authorName: z.string().min(1).max(60),
  authorId: z.string().min(1),
  body: z.string().min(1).max(600),
  helpful: z.boolean(),
  reported: z.boolean(),
  createdAt: isoDateTime,
});
export type Comment = z.infer<typeof commentSchema>;

export const groupSchema = z.object({
  id,
  name: z.string().min(1).max(80),
  kind: z.enum(["especie", "raca", "cidade", "interesse", "atividade"]),
  description: z.string().max(200),
  members: z.number().int().min(0),
  city: z.string().max(60).nullable(),
});
export type Group = z.infer<typeof groupSchema>;

export const productSchema = z.object({
  id,
  name: z.string().min(1).max(90),
  brand: z.string().max(50),
  category: z.enum([
    "alimentacao",
    "higiene",
    "passeio",
    "saude",
    "enriquecimento",
  ]),
  description: z.string().max(240),
  priceBRL: z.number().nonnegative(),
  partnerName: z.string().max(60),
  partnerPlaceId: id.nullable(),
  sizes: z.array(z.enum(["mini", "pequeno", "medio", "grande", "gigante"])),
  lifeStages: z.array(z.enum(["filhote", "adulto", "idoso"])),
  species: z.array(speciesSchema),
  routineTags: z.array(z.string().max(30)),
  link: z.string().max(300),
});
export type Product = z.infer<typeof productSchema>;

export const notificationKindSchema = z.enum([
  "prevencao",
  "rotina",
  "social",
  "local",
  "comercial",
]);
export type NotificationKind = z.infer<typeof notificationKindSchema>;

export const notificationSchema = z.object({
  id,
  kind: notificationKindSchema,
  title: z.string().min(1).max(120),
  body: z.string().max(240),
  href: z.string().max(200).nullable(),
  createdAt: isoDateTime,
  readAt: isoDateTime.nullable(),
  dismissed: z.boolean(),
});
export type AppNotification = z.infer<typeof notificationSchema>;

export const analyticsEventSchema = z.object({
  name: z.string().min(1).max(60),
  at: isoDateTime,
  props: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .nullable(),
});
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

export const settingsSchema = z.object({
  city: z.string().max(60),
  reminderLeadDays: z.number().int().min(1).max(90),
  notifications: z.object({
    prevencao: z.boolean(),
    rotina: z.boolean(),
    social: z.boolean(),
    local: z.boolean(),
    comercial: z.boolean(),
  }),
  usePreciseLocation: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const tutorSchema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().max(120).nullable(),
  city: z.string().max(60),
  focusAreas: z.array(focusAreaSchema),
  marketingOptIn: z.boolean(),
  createdAt: isoDateTime,
});
export type Tutor = z.infer<typeof tutorSchema>;

export const publicPetCardSchema = z.object({
  v: z.literal(1),
  name: z.string().min(1).max(60),
  species: speciesSchema,
  breed: z.string().max(60).nullable(),
  city: z.string().max(60).nullable(),
  lost: z
    .object({
      since: isoDate.nullable(),
      note: z.string().max(280).nullable(),
    })
    .nullable(),
  health: z
    .object({
      status: z.enum(["em_dia", "atencao", "vencido"]),
      nextDueDate: isoDate.nullable(),
    })
    .nullable(),
  contact: z.string().max(120).nullable(),
});
export type PublicPetCard = z.infer<typeof publicPetCardSchema>;
