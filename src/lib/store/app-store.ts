"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createBackup,
  MAX_BACKUP_BYTES,
  parseBackup,
  persistedStateSchema,
  type PersistedState,
} from "@/lib/domain/backup";
import { validatedStorage, writePersistedState } from "./storage";
import { clearFormDrafts } from "@/lib/use-form-draft";
import {
  documentMetadataSchema,
  petDocumentSchema,
  type PetDocument,
  type NewDocumentInput,
  type DocumentPatch,
} from "@/lib/domain/document";
import { validateDocumentFile } from "@/lib/document-file";
import { blobBytes, bytesDataUrl, mediaDataUrl, prepareMedia } from "./media";

import type {
  AnalyticsEventName,
  AnalyticsProps,
} from "@/lib/domain/analytics";
import {
  addMonthsToKey,
  isValidDateKey,
  nowIso,
  todayKey,
} from "@/lib/domain/dates";
import {
  sameCareValue,
  validateCareRecord,
  validateRoutineReminder,
  type CareUndo,
} from "@/lib/domain/care";
import { reconcileWeights, weightTimestamp } from "@/lib/domain/weight";
import {
  endMedicationCourse,
  recordMedicationDose,
  reviseMedicationCourse,
  type RecordMedicationDoseInput,
} from "@/lib/domain/medication";
import type { MedicationPlanInput, SyncTombstone } from "@/lib/domain/schema";
import { diaryEntrySchema, petSchema, placeSchema } from "@/lib/domain/schema";
import {
  deriveNotifications,
  mergeNotifications,
} from "@/lib/domain/notifications";
import type { ReminderItem } from "@/lib/domain/reminders";
import { snoozeUntil } from "@/lib/domain/reminders";
import {
  PILOT_CITY,
  seedComments,
  seedGroups,
  seedPlaces,
  seedPosts,
  seedProducts,
  seedReviews,
} from "@/lib/domain/seed";
import type {
  AnalyticsEvent,
  AppNotification,
  Comment,
  DiaryEntry,
  Group,
  HealthRecord,
  Pet,
  Place,
  Post,
  Product,
  Reminder,
  Review,
  Settings,
  Tutor,
} from "@/lib/domain/schema";
import { newId } from "@/lib/id";

const MY_AUTHOR_ID = "me";

export type AppState = {
  tutor: Tutor | null;
  pets: Pet[];
  activePetId: string | null;
  records: HealthRecord[];
  reminders: Reminder[];
  snoozes: Record<string, string>;
  diary: DiaryEntry[];
  documents: PetDocument[];
  places: Place[];
  reviews: Review[];
  posts: Post[];
  comments: Comment[];
  groups: Group[];
  products: Product[];
  notifications: AppNotification[];
  events: AnalyticsEvent[];
  settings: Settings;
  blockedAuthorIds: string[];
  memberGroupIds: string[];
  seededAt: string | null;
  lastSweepAt: string | null;
  syncTombstones?: SyncTombstone[];
  ready: boolean;
};

export type SyncActions = {
  completeOnboarding: (input: {
    tutorName: string;
    email: string | null;
    city: string;
    focusAreas: Tutor["focusAreas"];
    pet: NewPetInput;
    initialRecord?: Omit<NewRecordInput, "petId">;
  }) => void;
  updateTutor: (patch: Partial<Tutor>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;

  addPet: (input: NewPetInput) => string;
  updatePet: (petId: string, patch: Partial<Pet>) => void;
  removePet: (petId: string) => void;
  setActivePet: (petId: string) => void;

  addRecord: (input: NewRecordInput) => string;
  updateRecord: (recordId: string, patch: Partial<HealthRecord>) => void;
  removeRecord: (recordId: string) => void;
  reviseMedicationPlan: (
    recordId: string,
    expectedScheduleId: string | null,
    plan: MedicationPlanInput,
  ) => void;
  endMedicationPlan: (recordId: string, expectedScheduleId: string) => void;
  recordMedicationDose: (
    recordId: string,
    input: RecordMedicationDoseInput,
  ) => string;

  addReminder: (input: NewReminderInput) => string;
  updateReminder: (reminderId: string, patch: Partial<Reminder>) => void;
  removeReminder: (reminderId: string) => void;
  completeReminderItem: (item: ReminderItem) => CareUndo | null;
  snoozeReminderItem: (item: ReminderItem, days: number) => CareUndo;
  rescheduleReminderItem: (item: ReminderItem, date: string) => CareUndo;
  skipReminderOccurrence: (item: ReminderItem) => CareUndo;
  stopReminderRecurrence: (item: ReminderItem) => CareUndo;
  undoCareAction: (undo: CareUndo) => void;
  batchRecordCare: (input: BatchCareInput) => BatchCareUndo;
  undoBatchCare: (undo: BatchCareUndo) => void;

  addDiaryEntry: (input: NewDiaryInput) => string;
  updateDiaryEntry: (entryId: string, patch: Partial<DiaryEntry>) => void;
  removeDiaryEntry: (entryId: string) => void;
  updateDocument: (id: string, patch: Partial<DocumentPatch>) => void;
  trashDocument: (id: string) => void;
  restoreDocument: (id: string) => void;

  addPlace: (input: NewPlaceInput) => string;
  updatePlace: (placeId: string, patch: Partial<Omit<Place, "id">>) => void;
  removePlace: (placeId: string) => void;
  toggleFavoritePlace: (placeId: string) => boolean;
  importOsmPlaces: (places: Place[]) => number;
  addReview: (input: NewReviewInput) => void;

  addPost: (input: NewPostInput) => string;
  removePost: (postId: string) => void;
  reportPost: (postId: string) => void;
  markPostHelpful: (postId: string) => void;

  addComment: (input: NewCommentInput) => string;
  markCommentHelpful: (commentId: string) => void;
  reportComment: (commentId: string) => void;

  blockAuthor: (authorId: string) => void;
  unblockAuthor: (authorId: string) => void;

  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;

  markNotificationRead: (notificationId: string) => void;
  dismissNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  sweepNotifications: () => void;
  markReady: () => void;

  track: (name: AnalyticsEventName, props?: AnalyticsProps) => void;
};

export type AppActions = {
  [K in keyof SyncActions]: K extends "markReady"
    ? SyncActions[K]
    : (
        ...args: Parameters<SyncActions[K]>
      ) => Promise<ReturnType<SyncActions[K]>>;
} & {
  createDocument: (input: NewDocumentInput, file: Blob) => Promise<string>;
};

let commandQueue: Promise<unknown> = Promise.resolve();
function enqueue<T>(command: () => Promise<T>): Promise<T> {
  const pending = commandQueue.then(command);
  commandQueue = pending.catch(() => undefined);
  return pending;
}

export type NewPetInput = {
  name: string;
  species: Pet["species"];
  breed?: string | null;
  sex: Pet["sex"];
  birthDate?: string | null;
  weightKg?: number | null;
  targetWeightKg?: number | null;
  photo?: string | null;
  color?: string | null;
  microchip?: string | null;
  notes?: string | null;
  routine?: string[];
  allergies?: string[];
  chronicConditions?: string[];
};

export type NewRecordInput = Omit<
  HealthRecord,
  "id" | "createdAt" | "completedAt"
> &
  Partial<Pick<HealthRecord, "completedAt">>;

export type NewReminderInput = Omit<Reminder, "id" | "createdAt" | "done"> &
  Partial<Pick<Reminder, "done">>;

export type BatchCareInput = {
  petIds: string[];
  title: string;
  notes?: string | null;
  date?: string;
};

export type BatchCareUndo = {
  recordIds: string[];
  completedReminderIds: string[];
};

export type NewDiaryInput = Omit<DiaryEntry, "id" | "createdAt">;

export type NewPlaceInput = Omit<Place, "id" | "seeded">;

export type NewReviewInput = Omit<Review, "id" | "createdAt" | "authorName"> & {
  authorName?: string;
};

export type NewPostInput = Omit<
  Post,
  | "id"
  | "createdAt"
  | "helpfulCount"
  | "reported"
  | "hidden"
  | "authorName"
  | "authorId"
>;

export type NewCommentInput = Omit<
  Comment,
  "id" | "createdAt" | "helpful" | "reported" | "authorName" | "authorId"
>;

export const defaultSettings: Settings = {
  city: PILOT_CITY,
  reminderLeadDays: 30,
  notifications: {
    prevencao: true,
    rotina: true,
    social: true,
    local: true,
    comercial: false,
  },
  usePreciseLocation: false,
};

const initialState: AppState = {
  tutor: null,
  pets: [],
  activePetId: null,
  records: [],
  reminders: [],
  snoozes: {},
  diary: [],
  documents: [],
  places: [],
  reviews: [],
  posts: [],
  comments: [],
  groups: [],
  products: [],
  notifications: [],
  events: [],
  settings: defaultSettings,
  blockedAuthorIds: [],
  memberGroupIds: [],
  seededAt: null,
  lastSweepAt: null,
  ready: false,
};

function buildPet(input: NewPetInput): Pet {
  const timestamp = nowIso();
  return petSchema.parse({
    id: newId("pet"),
    name: input.name.trim(),
    species: input.species,
    breed: input.breed?.trim() || null,
    sex: input.sex,
    birthDate: input.birthDate ?? null,
    weightKg: input.weightKg ?? null,
    targetWeightKg: input.targetWeightKg ?? null,
    weightBaseline:
      input.weightKg != null
        ? { weightKg: input.weightKg, date: todayKey(), updatedAt: timestamp }
        : null,
    photo: input.photo ?? null,
    color: input.color ?? null,
    microchip: input.microchip ?? null,
    notes: input.notes ?? null,
    routine: input.routine ?? [],
    allergies: input.allergies ?? [],
    chronicConditions: input.chronicConditions ?? [],
    card: {
      shareBreed: true,
      shareCity: true,
      shareHealth: true,
      contact: null,
    },
    lostMode: { active: false, since: null, note: null },
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

function recordEvent(
  events: AnalyticsEvent[],
  name: AnalyticsEventName,
  props?: AnalyticsProps,
): AnalyticsEvent[] {
  return [{ name, at: nowIso(), props: props ?? null }, ...events].slice(
    0,
    200,
  );
}

function appendTombstones(
  existing: SyncTombstone[] | undefined,
  entries: SyncTombstone[],
): SyncTombstone[] {
  if (entries.length === 0) return existing ?? [];
  const byKey = new Map<string, SyncTombstone>();
  for (const item of existing ?? []) {
    byKey.set(`${item.collection}:${item.id}`, item);
  }
  for (const item of entries) {
    byKey.set(`${item.collection}:${item.id}`, item);
  }
  return [...byKey.values()]
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
    .slice(0, 500);
}

function currentCareSource(state: AppState, item: ReminderItem) {
  if (item.source === "medicamento")
    throw new Error("Registre esta dose no plano de medicação.");
  if (!state.pets.some((pet) => pet.id === item.petId)) {
    throw new Error("Este pet não está mais disponível.");
  }
  if (item.source === "registro") {
    const record = state.records.find(
      (entry) => entry.id === item.id && entry.petId === item.petId,
    );
    if (
      !record ||
      record.medication ||
      !record.nextDueDate ||
      record.nextDueDate !== item.dueDate
    ) {
      throw new Error(
        "Este cuidado mudou. Atualize a agenda antes de continuar.",
      );
    }
    return { source: "registro" as const, value: record };
  }
  const reminder = state.reminders.find(
    (entry) => entry.id === item.id && entry.petId === item.petId,
  );
  if (!reminder || reminder.done || reminder.dueDate !== item.dueDate) {
    throw new Error(
      "Este lembrete mudou. Atualize a agenda antes de continuar.",
    );
  }
  return { source: "manual" as const, value: reminder };
}

function careUndo(state: AppState, item: ReminderItem): CareUndo {
  return {
    petId: item.petId,
    key: `${item.source}:${item.id}`,
    records: [],
    reminders: [],
    snoozeBefore: state.snoozes[`${item.source}:${item.id}`],
    snoozeAfter: undefined,
  };
}

function carePatch(
  state: AppState,
  patch: Partial<AppState>,
): Partial<AppState> {
  const updated = { ...state, ...patch };
  const incoming = deriveNotifications({
    pets: updated.pets,
    records: updated.records,
    reminders: updated.reminders,
    snoozes: updated.snoozes,
    places: updated.places,
    products: updated.products,
    enabled: updated.settings.notifications,
  });
  const activeIds = new Set(incoming.map((notification) => notification.id));
  const retained = state.notifications.filter(
    (notification) =>
      !(
        notification.id.startsWith("notif-prevencao-") ||
        notification.id.startsWith("notif-rotina-")
      ) || activeIds.has(notification.id),
  );
  return {
    ...patch,
    notifications: mergeNotifications(retained, incoming),
    lastSweepAt: nowIso(),
  };
}

const boundStore = create<AppState & AppActions>()(
  persist(
    (commit, baseGet) => {
      let staged: (AppState & AppActions) | null = null;
      const get = () => staged ?? baseGet();
      // Reducers stage changes; the queued command commits only after IndexedDB completes.
      const set = (
        update:
          | Partial<AppState>
          | ((state: AppState & AppActions) => Partial<AppState>),
      ) => {
        const patch = typeof update === "function" ? update(get()) : update;
        if (!staged) throw new Error("Alteração fora de uma transação.");
        staged = { ...staged, ...patch };
      };
      const syncActions: SyncActions = {
        completeOnboarding: ({
          tutorName,
          email,
          city,
          focusAreas,
          pet,
          initialRecord,
        }) => {
          if (get().tutor)
            throw new Error(
              "Este perfil já foi criado. Abra o início para continuar.",
            );
          const created = buildPet(pet);
          const record = initialRecord
            ? validateCareRecord({
                ...initialRecord,
                id: newId("record"),
                petId: created.id,
                completedAt: initialRecord.completedAt ?? null,
                createdAt: nowIso(),
              })
            : null;
          set((state) =>
            carePatch(
              state,
              reconcileWeights(
                state,
                {
                  tutor: {
                    name: tutorName.trim(),
                    email: email?.trim() || null,
                    city: city.trim() || PILOT_CITY,
                    focusAreas,
                    marketingOptIn: false,
                    createdAt: nowIso(),
                  },
                  settings: {
                    ...state.settings,
                    city: city.trim() || PILOT_CITY,
                  },
                  pets: [created],
                  activePetId: created.id,
                  records: record ? [record, ...state.records] : state.records,
                  events: recordEvent(
                    recordEvent(state.events, "onboarding_completed"),
                    "pet_created",
                    { species: created.species },
                  ),
                },
                [created.id],
              ),
            ),
          );
        },

        updateTutor: (patch) =>
          set((state) => ({
            tutor: state.tutor ? { ...state.tutor, ...patch } : state.tutor,
            settings: patch.city
              ? { ...state.settings, city: patch.city }
              : state.settings,
          })),

        updateSettings: (patch) =>
          set((state) => ({
            settings: {
              ...state.settings,
              ...patch,
              notifications: {
                ...state.settings.notifications,
                ...(patch.notifications ?? {}),
              },
            },
          })),

        resetAll: () => {
          set({ ...initialState, ready: true });
        },

        addPet: (input) => {
          const created = buildPet(input);
          set((state) => ({
            pets: [...state.pets, created],
            activePetId: created.id,
            events: recordEvent(state.events, "pet_created", {
              species: created.species,
            }),
          }));
          return created.id;
        },

        updatePet: (petId, patch) => {
          const state = get();
          const pet = state.pets.find((entry) => entry.id === petId);
          if (!pet) throw new Error("Pet não encontrado.");
          const updated = petSchema.parse({
            ...pet,
            ...patch,
            id: pet.id,
            createdAt: pet.createdAt,
            updatedAt: nowIso(),
            weightBaseline:
              patch.weightKg !== undefined && patch.weightKg !== pet.weightKg
                ? {
                    weightKg: patch.weightKg,
                    date: todayKey(),
                    updatedAt: weightTimestamp(state, petId),
                  }
                : pet.weightBaseline,
          });
          set(
            reconcileWeights(
              state,
              {
                pets: state.pets.map((entry) =>
                  entry.id === petId ? updated : entry,
                ),
              },
              [petId],
            ),
          );
        },

        removePet: (petId) =>
          set((state) => {
            const deletedAt = nowIso();
            const petRecords = state.records.filter(
              (record) => record.petId === petId,
            );
            const petReminders = state.reminders.filter(
              (reminder) => reminder.petId === petId,
            );
            const petDiary = state.diary.filter(
              (entry) => entry.petId === petId,
            );
            const petDocs = state.documents.filter(
              (entry) => entry.petId === petId,
            );
            const removedIds = new Set([
              ...petRecords.map((record) => record.id),
              ...petReminders.map((reminder) => reminder.id),
            ]);
            const pets = state.pets.filter((pet) => pet.id !== petId);
            return carePatch(state, {
              pets,
              records: state.records.filter((record) => record.petId !== petId),
              reminders: state.reminders.filter(
                (reminder) => reminder.petId !== petId,
              ),
              diary: state.diary.filter((entry) => entry.petId !== petId),
              documents: state.documents.filter(
                (entry) => entry.petId !== petId,
              ),
              snoozes: Object.fromEntries(
                Object.entries(state.snoozes).filter(([key]) => {
                  const [, sourceId] = key.split(":");
                  return !removedIds.has(sourceId);
                }),
              ),
              activePetId:
                state.activePetId === petId
                  ? (pets[0]?.id ?? null)
                  : state.activePetId,
              syncTombstones: appendTombstones(state.syncTombstones, [
                { collection: "pets", id: petId, deletedAt },
                ...petRecords.map((r) => ({
                  collection: "records" as const,
                  id: r.id,
                  deletedAt,
                })),
                ...petReminders.map((r) => ({
                  collection: "reminders" as const,
                  id: r.id,
                  deletedAt,
                })),
                ...petDiary.map((d) => ({
                  collection: "diary" as const,
                  id: d.id,
                  deletedAt,
                })),
                ...petDocs.map((d) => ({
                  collection: "documents" as const,
                  id: d.id,
                  deletedAt,
                })),
              ]),
            });
          }),

        setActivePet: (petId) => set({ activePetId: petId }),

        addRecord: (input) => {
          if (!get().pets.some((pet) => pet.id === input.petId))
            throw new Error("Pet não encontrado.");
          const timestamp = nowIso();
          const record = validateCareRecord({
            ...input,
            id: newId("record"),
            completedAt: input.completedAt ?? null,
            createdAt: timestamp,
            updatedAt: timestamp,
            weightUpdatedAt:
              input.weightKg !== null
                ? weightTimestamp(get(), input.petId)
                : undefined,
          });
          set((state) =>
            carePatch(
              state,
              reconcileWeights(
                state,
                {
                  records: [record, ...state.records],
                  events: recordEvent(state.events, "health_record_created", {
                    type: record.type,
                  }),
                },
                [record.petId],
              ),
            ),
          );
          return record.id;
        },

        updateRecord: (recordId, patch) => {
          const existing = get().records.find(
            (record) => record.id === recordId,
          );
          if (!existing) throw new Error("Registro não encontrado.");
          if (existing.medication && patch.type && patch.type !== "medicamento")
            throw new Error(
              "Este registro tem um histórico de doses. Preserve o tipo medicamento.",
            );
          const updated = validateCareRecord({
            ...existing,
            ...patch,
            // General record edits cannot overwrite dose events from another screen.
            medication: existing.medication ?? patch.medication ?? null,
            id: existing.id,
            petId: existing.petId,
            createdAt: existing.createdAt,
            updatedAt: nowIso(),
            weightUpdatedAt:
              (patch.weightKg !== undefined &&
                patch.weightKg !== existing.weightKg) ||
              (patch.date !== undefined && patch.date !== existing.date)
                ? weightTimestamp(get(), existing.petId)
                : existing.weightUpdatedAt,
          });
          set((state) =>
            carePatch(
              state,
              reconcileWeights(
                state,
                {
                  records: state.records.map((record) =>
                    record.id === recordId ? updated : record,
                  ),
                  snoozes:
                    existing.nextDueDate === updated.nextDueDate
                      ? state.snoozes
                      : Object.fromEntries(
                          Object.entries(state.snoozes).filter(
                            ([key]) => key !== `registro:${recordId}`,
                          ),
                        ),
                },
                [existing.petId],
              ),
            ),
          );
        },

        reviseMedicationPlan: (recordId, expectedScheduleId, plan) => {
          const record = get().records.find((entry) => entry.id === recordId);
          if (!record?.medication)
            throw new Error("Plano de medicação não encontrado.");
          if (record.medication.activeScheduleId !== expectedScheduleId)
            throw new Error(
              "O plano mudou. Abra a edição novamente antes de salvar.",
            );
          const medication = reviseMedicationCourse(
            record.medication,
            plan,
            newId("med-plan"),
          );
          const timestamp = nowIso();
          set((state) =>
            carePatch(state, {
              records: state.records.map((entry) =>
                entry.id === recordId
                  ? { ...entry, medication, updatedAt: timestamp }
                  : entry,
              ),
            }),
          );
        },

        endMedicationPlan: (recordId, expectedScheduleId) => {
          const record = get().records.find((entry) => entry.id === recordId);
          if (!record?.medication)
            throw new Error("Plano de medicação não encontrado.");
          const medication = endMedicationCourse(
            record.medication,
            expectedScheduleId,
          );
          const timestamp = nowIso();
          set((state) =>
            carePatch(state, {
              records: state.records.map((entry) =>
                entry.id === recordId
                  ? { ...entry, medication, updatedAt: timestamp }
                  : entry,
              ),
            }),
          );
        },

        recordMedicationDose: (recordId, input) => {
          const record = get().records.find((entry) => entry.id === recordId);
          if (!record?.medication)
            throw new Error("Plano de medicação não encontrado.");
          const eventId = newId("dose");
          const tutorName = get().tutor?.name?.trim() || null;
          const medication = recordMedicationDose(
            record.medication,
            {
              ...input,
              recordedBy: input.recordedBy ?? tutorName,
              actorRole: input.actorRole ?? "tutor",
            },
            eventId,
          );
          const timestamp = nowIso();
          set((state) =>
            carePatch(state, {
              records: state.records.map((entry) =>
                entry.id === recordId
                  ? { ...entry, medication, updatedAt: timestamp }
                  : entry,
              ),
            }),
          );
          return eventId;
        },

        removeRecord: (recordId) =>
          set((state) =>
            carePatch(
              state,
              reconcileWeights(
                state,
                {
                  records: state.records.filter(
                    (record) => record.id !== recordId,
                  ),
                  snoozes: Object.fromEntries(
                    Object.entries(state.snoozes).filter(
                      ([key]) => key !== `registro:${recordId}`,
                    ),
                  ),
                  syncTombstones: appendTombstones(state.syncTombstones, [
                    { collection: "records", id: recordId, deletedAt: nowIso() },
                  ]),
                },
                state.records
                  .filter((record) => record.id === recordId)
                  .map((record) => record.petId),
              ),
            ),
          ),

        addReminder: (input) => {
          if (!get().pets.some((pet) => pet.id === input.petId))
            throw new Error("Pet não encontrado.");
          const timestamp = nowIso();
          const reminder = validateRoutineReminder({
            ...input,
            id: newId("reminder"),
            done: input.done ?? false,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
          set((state) =>
            carePatch(state, {
              reminders: [reminder, ...state.reminders],
              events: recordEvent(state.events, "reminder_created", {
                kind: reminder.kind,
              }),
            }),
          );
          return reminder.id;
        },

        updateReminder: (reminderId, patch) => {
          const existing = get().reminders.find(
            (reminder) => reminder.id === reminderId,
          );
          if (!existing) throw new Error("Lembrete não encontrado.");
          const updated = validateRoutineReminder({
            ...existing,
            ...patch,
            id: existing.id,
            petId: existing.petId,
            createdAt: existing.createdAt,
            updatedAt: nowIso(),
          });
          set((state) =>
            carePatch(state, {
              reminders: state.reminders.map((reminder) =>
                reminder.id === reminderId ? updated : reminder,
              ),
              snoozes:
                existing.dueDate === updated.dueDate
                  ? state.snoozes
                  : Object.fromEntries(
                      Object.entries(state.snoozes).filter(
                        ([key]) => key !== `manual:${reminderId}`,
                      ),
                    ),
            }),
          );
        },

        removeReminder: (reminderId) =>
          set((state) =>
            carePatch(state, {
              reminders: state.reminders.filter(
                (reminder) => reminder.id !== reminderId,
              ),
              snoozes: Object.fromEntries(
                Object.entries(state.snoozes).filter(
                  ([key]) => key !== `manual:${reminderId}`,
                ),
              ),
              syncTombstones: appendTombstones(state.syncTombstones, [
                {
                  collection: "reminders",
                  id: reminderId,
                  deletedAt: nowIso(),
                },
              ]),
            }),
          ),

        completeReminderItem: (item) => {
          const state = get();
          // A completed occurrence can be clicked again from another still-open view.
          if (
            item.source === "registro" &&
            state.records.some(
              (record) =>
                record.id === item.id &&
                record.petId === item.petId &&
                !record.nextDueDate &&
                record.completedAt,
            )
          )
            return null;
          if (
            item.source === "manual" &&
            state.reminders.some(
              (reminder) =>
                reminder.id === item.id &&
                reminder.petId === item.petId &&
                reminder.done,
            )
          )
            return null;
          const current = currentCareSource(state, item);
          const undo = careUndo(state, item);
          const today = todayKey();
          const timestamp = nowIso();
          const snoozes = { ...state.snoozes };
          delete snoozes[undo.key];
          if (current.source === "manual") {
            const after = {
              ...current.value,
              done: true,
              completedAt: timestamp,
            };
            undo.reminders.push({ before: current.value, after });
            set(
              carePatch(state, {
                reminders: state.reminders.map((reminder) =>
                  reminder.id === item.id ? after : reminder,
                ),
                snoozes,
                events: recordEvent(state.events, "reminder_completed", {
                  source: item.source,
                }),
              }),
            );
          } else {
            const record = current.value;
            const months = record.recurrenceMonths;
            const nextRecord: HealthRecord = {
              ...record,
              id: newId("record"),
              date: today,
              nextDueDate: months ? addMonthsToKey(today, months) : null,
              completedAt: null,
              attachmentData: null,
              attachmentName: null,
              weightKg: null,
              createdAt: timestamp,
            };
            const after = {
              ...record,
              nextDueDate: null,
              completedAt: timestamp,
            };
            undo.records.push(
              { before: record, after },
              { before: null, after: nextRecord },
            );
            set(
              carePatch(state, {
                records: [
                  nextRecord,
                  ...state.records.map((entry) =>
                    entry.id === record.id ? after : entry,
                  ),
                ],
                snoozes,
                events: recordEvent(state.events, "reminder_completed", {
                  source: item.source,
                }),
              }),
            );
          }
          return undo;
        },

        snoozeReminderItem: (item, days) => {
          if (!Number.isInteger(days) || days < 1 || days > 3650)
            throw new Error("Escolha um prazo válido para adiar.");
          const state = get();
          const current = currentCareSource(state, item);
          const undo = careUndo(state, item);
          // Keep the source in the token so undo cannot overwrite a newer occurrence.
          if (current.source === "registro")
            undo.records.push({ before: current.value, after: current.value });
          else
            undo.reminders.push({
              before: current.value,
              after: current.value,
            });
          const until = snoozeUntil(days);
          undo.snoozeAfter = until;
          set(
            carePatch(state, {
              snoozes: { ...state.snoozes, [undo.key]: until },
              events: recordEvent(state.events, "reminder_snoozed", { days }),
            }),
          );
          return undo;
        },

        rescheduleReminderItem: (item, date) => {
          if (!isValidDateKey(date) || date < todayKey())
            throw new Error("Escolha uma data válida a partir de hoje.");
          const state = get();
          const current = currentCareSource(state, item);
          const undo = careUndo(state, item);
          const snoozes = { ...state.snoozes };
          delete snoozes[undo.key];
          if (current.source === "registro") {
            const after = { ...current.value, nextDueDate: date };
            undo.records.push({ before: current.value, after });
            set(
              carePatch(state, {
                records: state.records.map((record) =>
                  record.id === item.id ? after : record,
                ),
                snoozes,
              }),
            );
          } else {
            const after = { ...current.value, dueDate: date };
            undo.reminders.push({ before: current.value, after });
            set(
              carePatch(state, {
                reminders: state.reminders.map((reminder) =>
                  reminder.id === item.id ? after : reminder,
                ),
                snoozes,
              }),
            );
          }
          return undo;
        },

        skipReminderOccurrence: (item) => {
          const state = get();
          const current = currentCareSource(state, item);
          if (current.source !== "registro" || !current.value.recurrenceMonths)
            throw new Error("Este cuidado não tem recorrência ativa.");
          const undo = careUndo(state, item);
          const after = {
            ...current.value,
            nextDueDate: addMonthsToKey(
              item.dueDate,
              current.value.recurrenceMonths,
            ),
          };
          undo.records.push({ before: current.value, after });
          const snoozes = { ...state.snoozes };
          delete snoozes[undo.key];
          set(
            carePatch(state, {
              records: state.records.map((record) =>
                record.id === item.id ? after : record,
              ),
              snoozes,
            }),
          );
          return undo;
        },

        stopReminderRecurrence: (item) => {
          const state = get();
          const current = currentCareSource(state, item);
          if (current.source !== "registro" || !current.value.recurrenceMonths)
            throw new Error("Este cuidado não tem recorrência ativa.");
          const undo = careUndo(state, item);
          const after = {
            ...current.value,
            nextDueDate: null,
            recurrenceMonths: null,
          };
          undo.records.push({ before: current.value, after });
          const snoozes = { ...state.snoozes };
          delete snoozes[undo.key];
          set(
            carePatch(state, {
              records: state.records.map((record) =>
                record.id === item.id ? after : record,
              ),
              snoozes,
            }),
          );
          return undo;
        },

        undoCareAction: (undo) => {
          const state = get();
          const unchanged =
            state.pets.some((pet) => pet.id === undo.petId) &&
            state.snoozes[undo.key] === undo.snoozeAfter &&
            undo.records.every(({ after }) =>
              sameCareValue(
                state.records.find((record) => record.id === after.id),
                after,
              ),
            ) &&
            undo.reminders.every(({ after }) =>
              sameCareValue(
                state.reminders.find((reminder) => reminder.id === after.id),
                after,
              ),
            );
          if (!unchanged)
            throw new Error(
              "Este cuidado foi alterado depois. Confira a agenda antes de editar novamente.",
            );
          const recordChanges = new Map(
            undo.records.map((change) => [change.after.id, change.before]),
          );
          const reminderChanges = new Map(
            undo.reminders.map((change) => [change.after.id, change.before]),
          );
          const snoozes = { ...state.snoozes };
          if (undo.snoozeBefore === undefined) delete snoozes[undo.key];
          else snoozes[undo.key] = undo.snoozeBefore;
          set(
            carePatch(state, {
              records: state.records.flatMap((record) =>
                recordChanges.has(record.id)
                  ? recordChanges.get(record.id)
                    ? [recordChanges.get(record.id)!]
                    : []
                  : [record],
              ),
              reminders: state.reminders.map(
                (reminder) => reminderChanges.get(reminder.id) ?? reminder,
              ),
              snoozes,
            }),
          );
        },

        batchRecordCare: (input) => {
          const timestamp = nowIso();
          const date = input.date ?? todayKey();
          const trimmedTitle = input.title?.trim();
          if (!trimmedTitle)
            throw new Error("Informe o nome do cuidado compartilhado.");
          const validPetIds = new Set(get().pets.map((p) => p.id));
          const petIds = [...new Set(input.petIds)].filter((id) =>
            validPetIds.has(id),
          );
          if (petIds.length === 0)
            throw new Error("Selecione ao menos um pet válido.");

          const newRecords: HealthRecord[] = petIds.map((petId) =>
            validateCareRecord({
              id: newId("record"),
              petId,
              type: "observacao",
              title: trimmedTitle,
              date,
              nextDueDate: null,
              leadDays: 0,
              recurrenceMonths: null,
              professional: null,
              notes: input.notes?.trim() || "Cuidado compartilhado",
              attachmentName: null,
              attachmentData: null,
              weightKg: null,
              completedAt: timestamp,
              createdAt: timestamp,
            }),
          );

          const reminderIdsToComplete: string[] = [];
          const updatedReminders = get().reminders.map((reminder) => {
            if (
              petIds.includes(reminder.petId) &&
              !reminder.done &&
              reminder.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
            ) {
              reminderIdsToComplete.push(reminder.id);
              return { ...reminder, done: true, completedAt: timestamp };
            }
            return reminder;
          });

          const snoozes = { ...get().snoozes };
          for (const remId of reminderIdsToComplete) {
            delete snoozes[`manual:${remId}`];
          }

          set((state) =>
            carePatch(state, {
              records: [...newRecords, ...state.records],
              reminders: updatedReminders,
              snoozes,
              events: recordEvent(state.events, "health_record_created", {
                type: "observacao",
              }),
            }),
          );

          return {
            recordIds: newRecords.map((r) => r.id),
            completedReminderIds: reminderIdsToComplete,
          };
        },

        undoBatchCare: (undo) => {
          const recordSet = new Set(undo.recordIds);
          const reminderSet = new Set(undo.completedReminderIds);
          set((state) =>
            carePatch(state, {
              records: state.records.filter((r) => !recordSet.has(r.id)),
              reminders: state.reminders.map((reminder) =>
                reminderSet.has(reminder.id)
                  ? { ...reminder, done: false, completedAt: null }
                  : reminder,
              ),
            }),
          );
        },

        addDiaryEntry: (input) => {
          if (!get().pets.some((pet) => pet.id === input.petId))
            throw new Error("Pet não encontrado.");
          const timestamp = nowIso();
          const entry = diaryEntrySchema.parse({
            ...input,
            id: newId("diary"),
            createdAt: timestamp,
            updatedAt: timestamp,
            weightUpdatedAt:
              input.weightKg !== null
                ? weightTimestamp(get(), input.petId)
                : undefined,
          });
          set((state) =>
            reconcileWeights(
              state,
              {
                diary: [entry, ...state.diary],
                events: recordEvent(state.events, "diary_entry_created", {
                  visibility: entry.visibility,
                }),
              },
              [entry.petId],
            ),
          );
          return entry.id;
        },

        updateDiaryEntry: (entryId, patch) => {
          const existing = get().diary.find((entry) => entry.id === entryId);
          if (!existing) throw new Error("Momento não encontrado.");
          const updated = diaryEntrySchema.parse({
            ...existing,
            ...patch,
            id: existing.id,
            petId: existing.petId,
            createdAt: existing.createdAt,
            updatedAt: nowIso(),
            weightUpdatedAt:
              (patch.weightKg !== undefined &&
                patch.weightKg !== existing.weightKg) ||
              (patch.date !== undefined && patch.date !== existing.date)
                ? weightTimestamp(get(), existing.petId)
                : existing.weightUpdatedAt,
          });
          set((state) =>
            reconcileWeights(
              state,
              {
                diary: state.diary.map((entry) =>
                  entry.id === entryId ? updated : entry,
                ),
              },
              [existing.petId],
            ),
          );
        },

        removeDiaryEntry: (entryId) =>
          set((state) =>
            reconcileWeights(
              state,
              {
                diary: state.diary.filter((entry) => entry.id !== entryId),
                syncTombstones: appendTombstones(state.syncTombstones, [
                  { collection: "diary", id: entryId, deletedAt: nowIso() },
                ]),
              },
              state.diary
                .filter((entry) => entry.id === entryId)
                .map((entry) => entry.petId),
            ),
          ),

        updateDocument: (id, patch) =>
          set((state) => {
            const document = state.documents.find((item) => item.id === id);
            if (!document || document.deletedAt)
              throw new Error("Documento não encontrado.");
            const metadata = documentMetadataSchema.parse({
              ...document,
              ...patch,
            });
            return {
              documents: state.documents.map((item) =>
                item.id === id
                  ? { ...item, ...metadata, updatedAt: nowIso() }
                  : item,
              ),
            };
          }),
        trashDocument: (id) =>
          set((state) => ({
            documents: state.documents.map((item) =>
              item.id === id
                ? {
                    ...item,
                    deletedAt: item.deletedAt ?? nowIso(),
                    updatedAt: nowIso(),
                  }
                : item,
            ),
          })),
        restoreDocument: (id) =>
          set((state) => ({
            documents: state.documents.map((item) =>
              item.id === id
                ? { ...item, deletedAt: null, updatedAt: nowIso() }
                : item,
            ),
          })),

        addPlace: (input) => {
          const timestamp = nowIso();
          const place: Place = placeSchema.parse({
            ...input,
            id: newId("place"),
            seeded: false,
            source: input.source ?? "local",
            favorite: input.favorite ?? false,
            createdAt: input.createdAt ?? timestamp,
            updatedAt: input.updatedAt ?? timestamp,
          });
          set((state) => ({ places: [place, ...state.places] }));
          return place.id;
        },

        updatePlace: (placeId, patch) => {
          const existing = get().places.find((item) => item.id === placeId);
          if (!existing) throw new Error("Local não encontrado.");
          const updated = placeSchema.parse({
            ...existing,
            ...patch,
            id: existing.id,
            updatedAt: nowIso(),
          });
          set((state) => ({
            places: state.places.map((item) =>
              item.id === placeId ? updated : item,
            ),
          }));
        },

        removePlace: (placeId) =>
          set((state) => ({
            places: state.places.filter((item) => item.id !== placeId),
            reviews: state.reviews.filter(
              (review) => review.placeId !== placeId,
            ),
            syncTombstones: appendTombstones(state.syncTombstones, [
              { collection: "places", id: placeId, deletedAt: nowIso() },
            ]),
          })),

        toggleFavoritePlace: (placeId) => {
          const existing = get().places.find((item) => item.id === placeId);
          if (!existing) throw new Error("Local não encontrado.");
          const nextFavorite = !existing.favorite;
          const updated: Place = {
            ...existing,
            favorite: nextFavorite,
            updatedAt: nowIso(),
          };
          set((state) => ({
            places: state.places.map((item) =>
              item.id === placeId ? updated : item,
            ),
          }));
          return nextFavorite;
        },

        importOsmPlaces: (incoming) => {
          const state = get();
          const timestamp = nowIso();
          const existingByOsmKey = new Map<string, Place>();
          for (const p of state.places) {
            const key = p.osmId ? `osm:${p.osmId}` : `id:${p.id}`;
            existingByOsmKey.set(key, p);
          }
          let addedOrUpdated = 0;
          const mergedMap = new Map<string, Place>(
            state.places.map((p) => [p.id, p]),
          );
          for (const raw of incoming) {
            const parsed = placeSchema.safeParse({
              ...raw,
              source: raw.source ?? "osm",
              seeded: false,
              updatedAt: timestamp,
            });
            if (!parsed.success) continue;
            const candidate = parsed.data;
            const key = candidate.osmId
              ? `osm:${candidate.osmId}`
              : `id:${candidate.id}`;
            const prev = existingByOsmKey.get(key) ?? mergedMap.get(candidate.id);
            if (prev) {
              mergedMap.set(prev.id, {
                ...prev,
                ...candidate,
                id: prev.id,
                favorite: prev.favorite ?? candidate.favorite,
                notes: prev.notes ?? candidate.notes,
                phone: prev.phone ?? candidate.phone,
                whatsapp: prev.whatsapp ?? candidate.whatsapp,
                updatedAt: timestamp,
              });
              addedOrUpdated += 1;
            } else {
              mergedMap.set(candidate.id, {
                ...candidate,
                createdAt: candidate.createdAt ?? timestamp,
                updatedAt: timestamp,
              });
              addedOrUpdated += 1;
            }
          }
          if (addedOrUpdated > 0) {
            set({ places: [...mergedMap.values()] });
          }
          return addedOrUpdated;
        },

        addReview: (input) => {
          const timestamp = nowIso();
          const review: Review = {
            ...input,
            id: newId("review"),
            authorName: input.authorName ?? get().tutor?.name ?? "Você",
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          set((state) => ({ reviews: [review, ...state.reviews] }));
        },

        addPost: (input) => {
          const timestamp = nowIso();
          const post: Post = {
            ...input,
            id: newId("post"),
            authorId: MY_AUTHOR_ID,
            authorName: get().tutor?.name ?? "Você",
            createdAt: timestamp,
            updatedAt: timestamp,
            helpfulCount: 0,
            reported: false,
            hidden: false,
          };
          set((state) => ({
            posts: [post, ...state.posts],
            events: recordEvent(state.events, "post_created", {
              type: post.type,
            }),
          }));
          return post.id;
        },

        removePost: (postId) =>
          set((state) => ({
            posts: state.posts.filter((post) => post.id !== postId),
            comments: state.comments.filter(
              (comment) => comment.postId !== postId,
            ),
            syncTombstones: appendTombstones(state.syncTombstones, [
              { collection: "posts", id: postId, deletedAt: nowIso() },
            ]),
          })),

        reportPost: (postId) =>
          set((state) => ({
            posts: state.posts.map((post) =>
              post.id === postId ? { ...post, reported: true } : post,
            ),
          })),

        markPostHelpful: (postId) =>
          set((state) => ({
            posts: state.posts.map((post) =>
              post.id === postId
                ? { ...post, helpfulCount: post.helpfulCount + 1 }
                : post,
            ),
          })),

        addComment: (input) => {
          const comment: Comment = {
            ...input,
            id: newId("comment"),
            authorId: MY_AUTHOR_ID,
            authorName: get().tutor?.name ?? "Você",
            helpful: false,
            reported: false,
            createdAt: nowIso(),
          };
          set((state) => ({
            comments: [comment, ...state.comments],
            events: recordEvent(state.events, "comment_created", {
              postId: comment.postId,
            }),
          }));
          return comment.id;
        },

        markCommentHelpful: (commentId) =>
          set((state) => ({
            comments: state.comments.map((comment) =>
              comment.id === commentId
                ? { ...comment, helpful: true }
                : comment,
            ),
          })),

        reportComment: (commentId) =>
          set((state) => ({
            comments: state.comments.map((comment) =>
              comment.id === commentId
                ? { ...comment, reported: true }
                : comment,
            ),
          })),

        blockAuthor: (authorId) =>
          set((state) => ({
            blockedAuthorIds: [
              ...new Set([...state.blockedAuthorIds, authorId]),
            ],
          })),

        unblockAuthor: (authorId) =>
          set((state) => ({
            blockedAuthorIds: state.blockedAuthorIds.filter(
              (id) => id !== authorId,
            ),
          })),

        joinGroup: (groupId) =>
          set((state) => ({
            memberGroupIds: [...new Set([...state.memberGroupIds, groupId])],
            groups: state.groups.map((group) =>
              group.id === groupId
                ? { ...group, members: group.members + 1 }
                : group,
            ),
          })),

        leaveGroup: (groupId) =>
          set((state) => ({
            memberGroupIds: state.memberGroupIds.filter((id) => id !== groupId),
            groups: state.groups.map((group) =>
              group.id === groupId
                ? { ...group, members: Math.max(0, group.members - 1) }
                : group,
            ),
          })),

        markNotificationRead: (notificationId) =>
          set((state) => ({
            notifications: state.notifications.map((item) =>
              item.id === notificationId ? { ...item, readAt: nowIso() } : item,
            ),
          })),

        dismissNotification: (notificationId) =>
          set((state) => ({
            notifications: state.notifications.map((item) =>
              item.id === notificationId ? { ...item, dismissed: true } : item,
            ),
          })),

        clearNotifications: () => set({ notifications: [] }),

        sweepNotifications: () => set((state) => carePatch(state, {})),

        markReady: () => commit({ ready: true }),

        track: (name, props) => {
          try {
            set((state) => ({
              events: recordEvent(state.events, name, props),
            }));
          } catch {
            // Optional analytics must never interrupt navigation or a saved action.
          }
        },
      };
      const actions = Object.fromEntries(
        Object.entries(syncActions).map(([name, reducer]) => {
          if (name === "markReady") return [name, reducer];
          return [
            name,
            (...args: unknown[]) => {
              const pending = enqueue(async () => {
                const previous = baseGet();
                staged = previous;
                let result: unknown;
                let next: AppState & AppActions;
                try {
                  result = (reducer as (...args: unknown[]) => unknown)(
                    ...args,
                  );
                  next = staged;
                } finally {
                  staged = null;
                }
                if (next !== previous) {
                  await writePersistedState(
                    next,
                    false,
                    {},
                    undefined,
                    [
                      "resetAll",
                      "removePet",
                      "updatePet",
                      "removeRecord",
                      "updateRecord",
                      "removeDiaryEntry",
                      "updateDiaryEntry",
                    ].includes(name),
                  );
                  commit(next);
                }
                if (name === "resetAll") clearFormDrafts();
                return result;
              });
              return name === "track"
                ? pending.catch(() => undefined)
                : pending;
            },
          ];
        }),
      ) as unknown as AppActions;
      return {
        ...initialState,
        ...actions,
        createDocument: (input, file) =>
          enqueue(async () => {
            const current = baseGet();
            if (!current.pets.some((pet) => pet.id === input.petId))
              throw new Error("Pet não encontrado.");
            const details = await validateDocumentFile(file, input.fileName);
            const media = await prepareMedia(
              await blobBytes(file),
              details.mimeType,
            );
            const timestamp = nowIso();
            const document = petDocumentSchema.parse({
              ...input,
              ...details,
              id: newId("document"),
              mediaId: media.id,
              createdAt: timestamp,
              updatedAt: timestamp,
              deletedAt: null,
            });
            const next = {
              ...current,
              documents: [...current.documents, document],
            };
            await writePersistedState(next, false, {
              [media.id]: bytesDataUrl(media.bytes, media.mimeType),
            });
            commit(next);
            return document.id;
          }),
      };
    },
    {
      name: "pethub-store",
      version: 1,
      storage: validatedStorage,
      skipHydration: true,
      partialize: (state) => ({
        tutor: state.tutor,
        pets: state.pets,
        activePetId: state.activePetId,
        records: state.records,
        reminders: state.reminders,
        snoozes: state.snoozes,
        diary: state.diary,
        documents: state.documents,
        places: state.places,
        reviews: state.reviews,
        posts: state.posts,
        comments: state.comments,
        groups: state.groups,
        products: state.products,
        notifications: state.notifications,
        events: state.events,
        settings: state.settings,
        blockedAuthorIds: state.blockedAuthorIds,
        memberGroupIds: state.memberGroupIds,
        seededAt: state.seededAt,
        lastSweepAt: state.lastSweepAt,
        ...(state.syncTombstones
          ? { syncTombstones: state.syncTombstones }
          : {}),
      }),
    },
  ),
);

type StoreState = AppState & AppActions;
type StateUpdate =
  | StoreState
  | Partial<StoreState>
  | ((state: StoreState) => StoreState | Partial<StoreState>);
type DurableStore = Omit<typeof boundStore, "setState"> & {
  (): StoreState;
  <T>(selector: (state: StoreState) => T): T;
  setState: (update: StateUpdate, replace?: boolean) => Promise<void>;
};
const commitStoreState = boundStore.setState;
export const useAppStore = boundStore as unknown as DurableStore;
useAppStore.setState = (update, replace) =>
  enqueue(async () => {
    const current = useAppStore.getState();
    const patch = typeof update === "function" ? update(current) : update;
    const next = { ...current, ...patch };
    await writePersistedState(next);
    if (replace) commitStoreState(next, true);
    else commitStoreState(patch);
  });

export const MY_AUTHOR = MY_AUTHOR_ID;

export async function seedIfNeeded() {
  const merge = <T extends { id: string }>(existing: T[], seed: T[]) => {
    const ids = new Set(existing.map((entry) => entry.id));
    return [...existing, ...seed.filter((entry) => !ids.has(entry.id))];
  };
  await useAppStore.setState((state) =>
    state.seededAt
      ? {}
      : {
          places: merge(state.places, seedPlaces),
          groups: merge(state.groups, seedGroups),
          products: merge(state.products, seedProducts),
          posts: merge(state.posts, seedPosts),
          comments: merge(state.comments, seedComments),
          reviews: merge(state.reviews, seedReviews),
          seededAt: nowIso(),
        },
  );
}

export function exportSnapshot(): Promise<string> {
  return enqueue(async () => {
    const state = useAppStore.getState();
    const files = Object.fromEntries(
      await Promise.all(
        [...new Set(state.documents.map((document) => document.mediaId))].map(
          async (id) => [id, await mediaDataUrl(id)],
        ),
      ),
    );
    const text = JSON.stringify(createBackup(state, files), null, 2);
    if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
      throw new Error(
        "A cópia completa excede 100 MB. Baixe os documentos separadamente e reduza os arquivos antes de exportar um backup restaurável.",
      );
    return text;
  });
}

export function restoreSnapshot(
  text: string,
  {
    recovering = false,
    expectedLocalState,
  }: { recovering?: boolean; expectedLocalState?: string } = {},
) {
  return enqueue(async () => {
    if (
      expectedLocalState !== undefined &&
      deviceContentSignature() !== expectedLocalState
    )
      throw new Error(
        "Os dados deste aparelho mudaram durante a revisão. Confira novamente antes de restaurar.",
      );
    const backup = parseBackup(text);
    const state = persistedStateSchema.parse(backup);
    await writePersistedState(state, recovering, backup.files, undefined, true);
    commitStoreState({ ...state, ready: true });
    clearFormDrafts();
  });
}

export function deviceContentSignature(
  state: PersistedState = useAppStore.getState(),
) {
  return JSON.stringify(persistedStateSchema.parse(state));
}

export function resetLocalDataForRecovery() {
  return enqueue(async () => {
    await writePersistedState(initialState, true, {}, undefined, true);
    commitStoreState({ ...initialState, ready: true });
    clearFormDrafts();
  });
}
