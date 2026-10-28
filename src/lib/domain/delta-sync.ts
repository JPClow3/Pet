import { z } from "zod";
import { petDocumentSchema, type PetDocument } from "./document";
import {
  createBackup,
  MAX_CLOUD_BACKUP_BYTES,
  normalizePersistedState,
  parseBackup,
  persistedStateSchema,
  type Backup,
} from "./backup";
import {
  commentSchema,
  diaryEntrySchema,
  groupSchema,
  healthRecordSchema,
  isoDate,
  isoDateTime,
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
  type SyncCollection,
  type SyncTombstone,
} from "./schema";

export const deltaUpsertsSchema = z.object({
  pets: z.array(petSchema).default([]),
  records: z.array(healthRecordSchema).default([]),
  reminders: z.array(reminderSchema).default([]),
  diary: z.array(diaryEntrySchema).default([]),
  documents: z.array(petDocumentSchema).default([]),
  places: z.array(placeSchema).default([]),
  reviews: z.array(reviewSchema).default([]),
  posts: z.array(postSchema).default([]),
  comments: z.array(commentSchema).default([]),
  notifications: z.array(notificationSchema).default([]),
  groups: z.array(groupSchema).default([]),
  products: z.array(productSchema).default([]),
});

export type DeltaUpserts = z.infer<typeof deltaUpsertsSchema>;

export const backupDeltaSchema = z.object({
  format: z.literal("pethub-delta"),
  version: z.literal(1),
  generatedAt: isoDateTime,
  upserts: deltaUpsertsSchema,
  tombstones: z.array(syncTombstoneSchema).default([]),
  files: z.record(z.string(), z.string()).default({}),
  tutor: tutorSchema.nullable().optional(),
  activePetId: z.string().nullable().optional(),
  snoozes: z.record(z.string(), isoDate).optional(),
  settings: settingsSchema.optional(),
  blockedAuthorIds: z.array(z.string()).optional(),
  memberGroupIds: z.array(z.string()).optional(),
  seededAt: isoDateTime.nullable().optional(),
  lastSweepAt: isoDateTime.nullable().optional(),
});

export type BackupDelta = z.infer<typeof backupDeltaSchema>;

export type DeltaSyncStats = {
  changedRecords: number;
  deletedRecords: number;
  transferredFiles: number;
  skippedFiles: number;
};

const SYNC_COLLECTIONS: SyncCollection[] = [
  "pets",
  "records",
  "reminders",
  "diary",
  "documents",
  "places",
  "reviews",
  "posts",
  "comments",
  "notifications",
];

type TimestampedEntity = {
  id: string;
  updatedAt?: string | null;
  createdAt?: string | null;
  weightUpdatedAt?: string | null;
  completedAt?: string | null;
  readAt?: string | null;
};

export function recordTimestamp(entity: TimestampedEntity): string {
  return (
    entity.updatedAt ??
    entity.weightUpdatedAt ??
    entity.completedAt ??
    entity.readAt ??
    entity.createdAt ??
    "1970-01-01T00:00:00.000Z"
  );
}

function recordsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffCollection<T extends { id: string }>(
  baseItems: T[],
  currentItems: T[],
  collection: SyncCollection | null,
  tombstoneMap: Map<string, SyncTombstone>,
  now: string,
): T[] {
  const baseById = new Map(baseItems.map((item) => [item.id, item]));
  const currentIds = new Set(currentItems.map((item) => item.id));
  const changed: T[] = [];

  for (const item of currentItems) {
    const prev = baseById.get(item.id);
    if (!prev || !recordsEqual(prev, item)) {
      changed.push(item);
    }
  }

  if (collection) {
    for (const prev of baseItems) {
      if (!currentIds.has(prev.id)) {
        const key = `${collection}:${prev.id}`;
        if (!tombstoneMap.has(key)) {
          tombstoneMap.set(key, {
            collection,
            id: prev.id,
            deletedAt: now,
          });
        }
      }
    }
  }

  return changed;
}

export function computeBackupDelta(
  baseBackup: Backup | null,
  currentBackup: Backup,
): { delta: BackupDelta; stats: DeltaSyncStats } {
  const now = new Date().toISOString();
  const tombstoneMap = new Map<string, SyncTombstone>();

  for (const t of currentBackup.syncTombstones ?? []) {
    const baseTombstone = baseBackup?.syncTombstones?.find(
      (bt) => bt.collection === t.collection && bt.id === t.id,
    );
    if (!baseTombstone || baseTombstone.deletedAt < t.deletedAt) {
      tombstoneMap.set(`${t.collection}:${t.id}`, t);
    }
  }

  const upserts: DeltaUpserts = {
    pets: diffCollection(
      baseBackup?.pets ?? [],
      currentBackup.pets,
      "pets",
      tombstoneMap,
      now,
    ),
    records: diffCollection(
      baseBackup?.records ?? [],
      currentBackup.records,
      "records",
      tombstoneMap,
      now,
    ),
    reminders: diffCollection(
      baseBackup?.reminders ?? [],
      currentBackup.reminders,
      "reminders",
      tombstoneMap,
      now,
    ),
    diary: diffCollection(
      baseBackup?.diary ?? [],
      currentBackup.diary,
      "diary",
      tombstoneMap,
      now,
    ),
    documents: diffCollection(
      baseBackup?.documents ?? [],
      currentBackup.documents,
      "documents",
      tombstoneMap,
      now,
    ),
    places: diffCollection(
      baseBackup?.places ?? [],
      currentBackup.places,
      "places",
      tombstoneMap,
      now,
    ),
    reviews: diffCollection(
      baseBackup?.reviews ?? [],
      currentBackup.reviews,
      "reviews",
      tombstoneMap,
      now,
    ),
    posts: diffCollection(
      baseBackup?.posts ?? [],
      currentBackup.posts,
      "posts",
      tombstoneMap,
      now,
    ),
    comments: diffCollection(
      baseBackup?.comments ?? [],
      currentBackup.comments,
      "comments",
      tombstoneMap,
      now,
    ),
    notifications: diffCollection(
      baseBackup?.notifications ?? [],
      currentBackup.notifications,
      "notifications",
      tombstoneMap,
      now,
    ),
    groups: diffCollection(
      baseBackup?.groups ?? [],
      currentBackup.groups,
      null,
      tombstoneMap,
      now,
    ),
    products: diffCollection(
      baseBackup?.products ?? [],
      currentBackup.products,
      null,
      tombstoneMap,
      now,
    ),
  };

  const files: Record<string, string> = {};
  let transferredFiles = 0;
  let skippedFiles = 0;
  const changedMediaIds = new Set(upserts.documents.map((doc) => doc.mediaId));

  for (const doc of currentBackup.documents) {
    const fileData = currentBackup.files[doc.mediaId];
    if (!fileData) continue;
    const baseHasSameFile =
      baseBackup?.files[doc.mediaId] === fileData &&
      !changedMediaIds.has(doc.mediaId);
    if (baseHasSameFile) {
      skippedFiles += 1;
    } else {
      files[doc.mediaId] = fileData;
      transferredFiles += 1;
    }
  }

  const changedRecords =
    upserts.pets.length +
    upserts.records.length +
    upserts.reminders.length +
    upserts.diary.length +
    upserts.documents.length +
    upserts.places.length +
    upserts.reviews.length +
    upserts.posts.length +
    upserts.comments.length +
    upserts.notifications.length +
    upserts.groups.length +
    upserts.products.length;

  const tombstones = [...tombstoneMap.values()];

  const delta: BackupDelta = backupDeltaSchema.parse({
    format: "pethub-delta",
    version: 1,
    generatedAt: now,
    upserts,
    tombstones,
    files,
    ...(baseBackup && recordsEqual(baseBackup.tutor, currentBackup.tutor)
      ? {}
      : { tutor: currentBackup.tutor }),
    ...(baseBackup && baseBackup.activePetId === currentBackup.activePetId
      ? {}
      : { activePetId: currentBackup.activePetId }),
    ...(baseBackup && recordsEqual(baseBackup.snoozes, currentBackup.snoozes)
      ? {}
      : { snoozes: currentBackup.snoozes }),
    ...(baseBackup && recordsEqual(baseBackup.settings, currentBackup.settings)
      ? {}
      : { settings: currentBackup.settings }),
    ...(baseBackup &&
    recordsEqual(baseBackup.blockedAuthorIds, currentBackup.blockedAuthorIds)
      ? {}
      : { blockedAuthorIds: currentBackup.blockedAuthorIds }),
    ...(baseBackup &&
    recordsEqual(baseBackup.memberGroupIds, currentBackup.memberGroupIds)
      ? {}
      : { memberGroupIds: currentBackup.memberGroupIds }),
    ...(baseBackup && baseBackup.seededAt === currentBackup.seededAt
      ? {}
      : { seededAt: currentBackup.seededAt }),
    ...(baseBackup && baseBackup.lastSweepAt === currentBackup.lastSweepAt
      ? {}
      : { lastSweepAt: currentBackup.lastSweepAt }),
  });

  return {
    delta,
    stats: {
      changedRecords,
      deletedRecords: tombstones.length,
      transferredFiles,
      skippedFiles,
    },
  };
}

function mergeCollectionWithDelta<T extends TimestampedEntity>(
  baseItems: T[],
  upserts: T[],
  collection: SyncCollection | null,
  tombstoneMap: Map<string, SyncTombstone>,
): T[] {
  const byId = new Map<string, T>();
  for (const item of baseItems) {
    byId.set(item.id, item);
  }
  for (const incoming of upserts) {
    const existing = byId.get(incoming.id);
    if (!existing) {
      byId.set(incoming.id, incoming);
      continue;
    }
    const existingTs = recordTimestamp(existing);
    const incomingTs = recordTimestamp(incoming);
    if (incomingTs >= existingTs) {
      byId.set(incoming.id, incoming);
    }
  }
  if (collection) {
    for (const [id, item] of byId.entries()) {
      const tombstone = tombstoneMap.get(`${collection}:${id}`);
      if (tombstone && tombstone.deletedAt >= recordTimestamp(item)) {
        byId.delete(id);
      }
    }
  }
  return [...byId.values()];
}

export function applyBackupDelta(
  baseBackup: Backup,
  rawDelta: unknown,
): Backup {
  const text =
    typeof rawDelta === "string" ? rawDelta : JSON.stringify(rawDelta);
  if (new TextEncoder().encode(text).byteLength > MAX_CLOUD_BACKUP_BYTES) {
    throw new Error("A atualização incremental excede o limite de 20 MB.");
  }
  const delta = backupDeltaSchema.parse(
    typeof rawDelta === "string" ? JSON.parse(rawDelta) : rawDelta,
  );

  const tombstoneMap = new Map<string, SyncTombstone>();
  for (const t of baseBackup.syncTombstones ?? []) {
    tombstoneMap.set(`${t.collection}:${t.id}`, t);
  }
  for (const t of delta.tombstones) {
    const key = `${t.collection}:${t.id}`;
    const existing = tombstoneMap.get(key);
    if (!existing || t.deletedAt >= existing.deletedAt) {
      tombstoneMap.set(key, t);
    }
  }

  const pets = mergeCollectionWithDelta(
    baseBackup.pets,
    delta.upserts.pets,
    "pets",
    tombstoneMap,
  );
  const validPetIds = new Set(pets.map((pet) => pet.id));

  const records = mergeCollectionWithDelta(
    baseBackup.records,
    delta.upserts.records,
    "records",
    tombstoneMap,
  ).filter((entry) => validPetIds.has(entry.petId));

  const reminders = mergeCollectionWithDelta(
    baseBackup.reminders,
    delta.upserts.reminders,
    "reminders",
    tombstoneMap,
  ).filter((entry) => validPetIds.has(entry.petId));

  const diary = mergeCollectionWithDelta(
    baseBackup.diary,
    delta.upserts.diary,
    "diary",
    tombstoneMap,
  ).filter((entry) => validPetIds.has(entry.petId));

  const documents: PetDocument[] = mergeCollectionWithDelta(
    baseBackup.documents,
    delta.upserts.documents,
    "documents",
    tombstoneMap,
  ).filter((entry) => validPetIds.has(entry.petId));

  const places = mergeCollectionWithDelta(
    baseBackup.places,
    delta.upserts.places,
    "places",
    tombstoneMap,
  );
  const validPlaceIds = new Set(places.map((place) => place.id));

  const reviews = mergeCollectionWithDelta(
    baseBackup.reviews,
    delta.upserts.reviews,
    "reviews",
    tombstoneMap,
  ).filter((review) => validPlaceIds.has(review.placeId));

  const posts = mergeCollectionWithDelta(
    baseBackup.posts,
    delta.upserts.posts,
    "posts",
    tombstoneMap,
  );
  const validPostIds = new Set(posts.map((post) => post.id));

  const comments = mergeCollectionWithDelta(
    baseBackup.comments,
    delta.upserts.comments,
    "comments",
    tombstoneMap,
  ).filter((comment) => validPostIds.has(comment.postId));

  const notifications = mergeCollectionWithDelta(
    baseBackup.notifications,
    delta.upserts.notifications,
    "notifications",
    tombstoneMap,
  );

  const groups = mergeCollectionWithDelta(
    baseBackup.groups,
    delta.upserts.groups,
    null,
    tombstoneMap,
  );

  const products = mergeCollectionWithDelta(
    baseBackup.products,
    delta.upserts.products,
    null,
    tombstoneMap,
  );

  const candidateActivePetId =
    delta.activePetId !== undefined
      ? delta.activePetId
      : baseBackup.activePetId;
  const activePetId =
    candidateActivePetId && validPetIds.has(candidateActivePetId)
      ? candidateActivePetId
      : (pets[0]?.id ?? null);

  const combinedFiles: Record<string, string> = {
    ...baseBackup.files,
    ...delta.files,
  };
  const activeFiles: Record<string, string> = {};
  for (const doc of documents) {
    const content = combinedFiles[doc.mediaId];
    if (content) {
      activeFiles[doc.mediaId] = content;
    }
  }

  const mergedTombstones = [...tombstoneMap.values()]
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
    .slice(0, 500);

  const nextState = normalizePersistedState(
    persistedStateSchema.parse({
      tutor: delta.tutor !== undefined ? delta.tutor : baseBackup.tutor,
      pets,
      activePetId,
      records,
      reminders,
      snoozes: delta.snoozes ?? {
        ...baseBackup.snoozes,
      },
      diary,
      documents,
      places,
      reviews,
      posts,
      comments,
      groups,
      products,
      notifications,
      events: baseBackup.events,
      settings: delta.settings ?? baseBackup.settings,
      blockedAuthorIds: delta.blockedAuthorIds ?? baseBackup.blockedAuthorIds,
      memberGroupIds: delta.memberGroupIds ?? baseBackup.memberGroupIds,
      seededAt:
        delta.seededAt !== undefined ? delta.seededAt : baseBackup.seededAt,
      lastSweepAt:
        delta.lastSweepAt !== undefined
          ? delta.lastSweepAt
          : baseBackup.lastSweepAt,
      ...(mergedTombstones.length > 0
        ? { syncTombstones: mergedTombstones }
        : {}),
    }),
  );

  const fullBackup = createBackup(nextState, activeFiles);
  // Run full parseBackup validation to guarantee document integrity & media limits
  return parseBackup(JSON.stringify(fullBackup));
}

export function mergeBackupsByRecord(
  remoteBackup: Backup,
  localBackup: Backup,
): { merged: Backup; delta: BackupDelta; stats: DeltaSyncStats } {
  const tombstoneMap = new Map<string, SyncTombstone>();
  for (const collection of SYNC_COLLECTIONS) {
    void collection;
  }
  for (const t of [
    ...(remoteBackup.syncTombstones ?? []),
    ...(localBackup.syncTombstones ?? []),
  ]) {
    const key = `${t.collection}:${t.id}`;
    const existing = tombstoneMap.get(key);
    if (!existing || t.deletedAt >= existing.deletedAt) {
      tombstoneMap.set(key, t);
    }
  }

  const deltaInput: BackupDelta = {
    format: "pethub-delta",
    version: 1,
    generatedAt: new Date().toISOString(),
    upserts: {
      pets: localBackup.pets,
      records: localBackup.records,
      reminders: localBackup.reminders,
      diary: localBackup.diary,
      documents: localBackup.documents,
      places: localBackup.places,
      reviews: localBackup.reviews,
      posts: localBackup.posts,
      comments: localBackup.comments,
      notifications: localBackup.notifications,
      groups: localBackup.groups,
      products: localBackup.products,
    },
    tombstones: [...tombstoneMap.values()],
    files: localBackup.files,
    tutor: localBackup.tutor ?? remoteBackup.tutor,
    activePetId: localBackup.activePetId ?? remoteBackup.activePetId,
    snoozes: { ...remoteBackup.snoozes, ...localBackup.snoozes },
    settings: localBackup.settings,
    blockedAuthorIds: [
      ...new Set([
        ...remoteBackup.blockedAuthorIds,
        ...localBackup.blockedAuthorIds,
      ]),
    ],
    memberGroupIds: [
      ...new Set([
        ...remoteBackup.memberGroupIds,
        ...localBackup.memberGroupIds,
      ]),
    ],
    seededAt: localBackup.seededAt ?? remoteBackup.seededAt,
    lastSweepAt: localBackup.lastSweepAt ?? remoteBackup.lastSweepAt,
  };

  const merged = applyBackupDelta(remoteBackup, deltaInput);
  const { delta, stats } = computeBackupDelta(remoteBackup, merged);
  return { merged, delta, stats };
}
