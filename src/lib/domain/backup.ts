import { z } from "zod";
import { reconcileWeights } from "./weight";
import { petDocumentSchema } from "./document";
import { sanitizeSeededPlace } from "./places";

import {
  analyticsEventSchema,
  commentSchema,
  diaryEntrySchema,
  groupSchema,
  healthRecordSchema,
  notificationSchema,
  petSchema,
  placeSchema,
  postSchema,
  productSchema,
  reminderSchema,
  reviewSchema,
  settingsSchema,
  syncTombstoneSchema,
  tutorSchema,
  isoDate,
  isoDateTime,
} from "./schema";
import {
  seedComments,
  seedGroups,
  seedPlaces,
  seedPosts,
  seedProducts,
  seedReviews,
} from "./seed";

export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
export const MAX_CLOUD_BACKUP_BYTES = 20 * 1024 * 1024;

// This is also the hydration boundary: functions and transient UI state never enter it.
export const persistedStateSchema = z
  .object({
    tutor: tutorSchema.nullable(),
    pets: z.array(petSchema),
    activePetId: z.string().nullable(),
    records: z.array(healthRecordSchema),
    reminders: z.array(reminderSchema),
    snoozes: z.record(z.string(), isoDate),
    diary: z.array(diaryEntrySchema),
    documents: z.array(petDocumentSchema).default([]),
    places: z.array(placeSchema),
    reviews: z.array(reviewSchema),
    posts: z.array(postSchema),
    comments: z.array(commentSchema),
    groups: z.array(groupSchema),
    products: z.array(productSchema),
    notifications: z.array(notificationSchema),
    events: z.array(analyticsEventSchema),
    settings: settingsSchema,
    blockedAuthorIds: z.array(z.string()),
    memberGroupIds: z.array(z.string()),
    seededAt: isoDateTime.nullable(),
    lastSweepAt: isoDateTime.nullable(),
    syncTombstones: z.array(syncTombstoneSchema).optional(),
  })
  .superRefine((state, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const petIds = new Set(state.pets.map((pet) => pet.id));
    if (state.activePetId && !petIds.has(state.activePetId))
      issue("Pet ativo não encontrado.");
    for (const collection of [
      state.pets,
      state.records,
      state.reminders,
      state.diary,
      state.documents,
      state.places,
      state.reviews,
      state.posts,
      state.comments,
      state.groups,
      state.products,
    ]) {
      if (
        new Set(collection.map((entry) => entry.id)).size !== collection.length
      ) {
        issue("O arquivo contém identificadores duplicados.");
      }
    }
    for (const entry of [
      ...state.records,
      ...state.reminders,
      ...state.diary,
      ...state.documents,
    ]) {
      if (!petIds.has(entry.petId))
        issue("Registro associado a um pet que não existe no arquivo.");
    }
  });

export type PersistedState = z.infer<typeof persistedStateSchema>;
export function normalizePersistedState(state: PersistedState): PersistedState {
  const seedById = new Map(seedPlaces.map((place) => [place.id, place]));
  return {
    ...state,
    // Demo entries follow the current catalogue (older builds named some
    // "24 horas"); a demo the tutor gave their own number to is kept as theirs.
    places: state.places.map((stored) => {
      const place = sanitizeSeededPlace(stored);
      const seed = place.seeded ? seedById.get(place.id) : undefined;
      return seed ? { ...seed, favorite: place.favorite } : place;
    }),
    // Older builds announced demo places as "perto de você".
    notifications: state.notifications.filter(
      (notification) =>
        !(
          notification.kind === "local" &&
          seedPlaces.some((place) => notification.id.includes(place.id))
        ),
    ),
    ...reconcileWeights(
      state,
      {},
      state.pets.map((pet) => pet.id),
    ),
  };
}
export type Backup = PersistedState & {
  format: "pethub-backup";
  version: 2;
  exportedAt: string;
  files: Record<string, string>;
};

export function createBackup(
  state: PersistedState,
  files: Record<string, string> = {},
): Backup {
  return {
    ...persistedStateSchema.parse(state),
    format: "pethub-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    files,
  };
}

export function parseBackup(text: string): Backup {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    throw new Error("O arquivo excede o limite de 100 MB.");
  }
  let raw: Record<string, unknown>;
  try {
    raw = z.record(z.string(), z.unknown()).parse(JSON.parse(text));
  } catch {
    throw new Error(
      "Não foi possível ler esse JSON. Escolha um backup da Zelupi.",
    );
  }
  if (
    raw.format !== undefined &&
    (raw.format !== "pethub-backup" || (raw.version !== 1 && raw.version !== 2))
  ) {
    throw new Error("Esta versão do backup não é compatível com o app.");
  }
  if (!z.iso.datetime().safeParse(raw.exportedAt).success) {
    throw new Error("O arquivo não contém uma data de exportação válida.");
  }
  // Exports from the original app omitted these fields. Recover them explicitly.
  const legacy = raw.format === undefined;
  const mergeLegacy = (seed: Array<{ id: string }>, entries: unknown) => {
    if (!Array.isArray(entries)) return entries;
    const rawIds = new Set(entries.map((entry) => entry?.id));
    return [...seed.filter((entry) => !rawIds.has(entry.id)), ...entries];
  };
  const result = persistedStateSchema.safeParse(
    legacy
      ? {
          activePetId: Array.isArray(raw.pets)
            ? ((raw.pets[0] as { id?: string })?.id ?? null)
            : null,
          snoozes: {},
          places: seedPlaces,
          groups: seedGroups,
          products: seedProducts,
          comments: seedComments,
          notifications: [],
          events: [],
          blockedAuthorIds: [],
          memberGroupIds: [],
          seededAt: raw.exportedAt,
          lastSweepAt: null,
          ...raw,
          posts: mergeLegacy(seedPosts, raw.posts),
          reviews: mergeLegacy(seedReviews, raw.reviews),
        }
      : raw,
  );
  if (!result.success) {
    throw new Error(
      "O backup contém dados inválidos ou incompletos. Nada foi alterado.",
    );
  }
  const images = [
    ...result.data.pets.map((pet) => pet.photo),
    ...result.data.records.map((record) => record.attachmentData),
    ...result.data.diary.map((entry) => entry.photo),
  ];
  if (
    images.some(
      (image) => image && /^(?:pethub-media:|blob:|file:)/i.test(image.trim()),
    )
  ) {
    throw new Error(
      "O backup contém uma referência local sem a imagem. Exporte novamente no aparelho de origem.",
    );
  }
  const files: Record<string, string> = {};
  const resources = z.record(z.string(), z.string()).safeParse(raw.files ?? {});
  if (!resources.success)
    throw new Error("Os arquivos do backup são inválidos.");
  for (const document of result.data.documents) {
    const data = resources.data[document.mediaId];
    const prefix = `data:${document.mimeType};base64,`;
    if (!data?.startsWith(prefix))
      throw new Error(
        "O backup não contém todos os documentos. Nada foi alterado.",
      );
    const body = data.slice(prefix.length);
    if (
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        body,
      )
    )
      throw new Error("Documento inválido no backup.");
    const size =
      (body.length * 3) / 4 -
      (body.endsWith("==") ? 2 : body.endsWith("=") ? 1 : 0);
    if (size !== document.sizeBytes)
      throw new Error("O tamanho de um documento no backup não confere.");
    files[document.mediaId] = data;
  }
  return {
    ...normalizePersistedState(result.data),
    format: "pethub-backup",
    version: 2,
    exportedAt: raw.exportedAt as string,
    files,
  };
}
