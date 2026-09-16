"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  AnalyticsEventName,
  AnalyticsProps,
} from "@/lib/domain/analytics";
import { addMonthsToKey, nowIso, todayKey } from "@/lib/domain/dates";
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

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export type AppState = {
  tutor: Tutor | null;
  pets: Pet[];
  activePetId: string | null;
  records: HealthRecord[];
  reminders: Reminder[];
  snoozes: Record<string, string>;
  diary: DiaryEntry[];
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
  ready: boolean;
};

export type AppActions = {
  completeOnboarding: (input: {
    tutorName: string;
    email: string | null;
    city: string;
    focusAreas: Tutor["focusAreas"];
    pet: NewPetInput;
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

  addReminder: (input: NewReminderInput) => string;
  updateReminder: (reminderId: string, patch: Partial<Reminder>) => void;
  removeReminder: (reminderId: string) => void;
  completeReminderItem: (item: ReminderItem) => void;
  snoozeReminderItem: (item: ReminderItem, days: number) => void;

  addDiaryEntry: (input: NewDiaryInput) => string;
  updateDiaryEntry: (entryId: string, patch: Partial<DiaryEntry>) => void;
  removeDiaryEntry: (entryId: string) => void;

  addPlace: (input: NewPlaceInput) => string;
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

export type NewPetInput = {
  name: string;
  species: Pet["species"];
  breed?: string | null;
  sex: Pet["sex"];
  birthDate?: string | null;
  weightKg?: number | null;
  photo?: string | null;
  color?: string | null;
  microchip?: string | null;
  notes?: string | null;
  routine?: string[];
};

export type NewRecordInput = Omit<
  HealthRecord,
  "id" | "createdAt" | "completedAt"
> &
  Partial<Pick<HealthRecord, "completedAt">>;

export type NewReminderInput = Omit<Reminder, "id" | "createdAt" | "done"> &
  Partial<Pick<Reminder, "done">>;

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
  return {
    id: newId("pet"),
    name: input.name.trim(),
    species: input.species,
    breed: input.breed?.trim() || null,
    sex: input.sex,
    birthDate: input.birthDate ?? null,
    weightKg: input.weightKg ?? null,
    photo: input.photo ?? null,
    color: input.color ?? null,
    microchip: input.microchip ?? null,
    notes: input.notes ?? null,
    routine: input.routine ?? [],
    card: {
      shareBreed: true,
      shareCity: true,
      shareHealth: true,
      contact: null,
    },
    lostMode: { active: false, since: null, note: null },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
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

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (commit, get) => {
      // Persist before notifying subscribers: a quota failure must never look saved.
      const set = (
        update:
          | Partial<AppState>
          | ((state: AppState & AppActions) => Partial<AppState>),
      ) => {
        const patch = typeof update === "function" ? update(get()) : update;
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              "pethub-store",
              JSON.stringify({ state: { ...get(), ...patch }, version: 1 }),
            );
          } catch {
            window.dispatchEvent(new Event("pethub-storage-error"));
            throw new Error(
              "Não foi possível salvar neste aparelho. Libere espaço e tente novamente; seu formulário continua aqui.",
            );
          }
        }
        commit(patch);
      };
      return {
        ...initialState,

        completeOnboarding: ({ tutorName, email, city, focusAreas, pet }) => {
          const created = buildPet(pet);
          set((state) => ({
            tutor: {
              name: tutorName.trim(),
              email: email?.trim() || null,
              city: city.trim() || PILOT_CITY,
              focusAreas,
              marketingOptIn: false,
              createdAt: nowIso(),
            },
            settings: { ...state.settings, city: city.trim() || PILOT_CITY },
            pets: [created],
            activePetId: created.id,
            events: recordEvent(state.events, "onboarding_completed"),
          }));
          get().track("pet_created", { species: created.species });
          get().sweepNotifications();
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

        resetAll: () => set({ ...initialState, ready: true }),

        addPet: (input) => {
          const created = buildPet(input);
          set((state) => ({
            pets: [...state.pets, created],
            activePetId: state.activePetId ?? created.id,
          }));
          get().track("pet_created", { species: created.species });
          return created.id;
        },

        updatePet: (petId, patch) =>
          set((state) => ({
            pets: state.pets.map((pet) =>
              pet.id === petId
                ? { ...pet, ...patch, updatedAt: nowIso() }
                : pet,
            ),
          })),

        removePet: (petId) =>
          set((state) => {
            const removedIds = new Set([
              ...state.records
                .filter((record) => record.petId === petId)
                .map((record) => record.id),
              ...state.reminders
                .filter((reminder) => reminder.petId === petId)
                .map((reminder) => reminder.id),
            ]);
            const pets = state.pets.filter((pet) => pet.id !== petId);
            return {
              pets,
              records: state.records.filter((record) => record.petId !== petId),
              reminders: state.reminders.filter(
                (reminder) => reminder.petId !== petId,
              ),
              diary: state.diary.filter((entry) => entry.petId !== petId),
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
            };
          }),

        setActivePet: (petId) => set({ activePetId: petId }),

        addRecord: (input) => {
          const record: HealthRecord = {
            ...input,
            id: newId("record"),
            completedAt: input.completedAt ?? null,
            createdAt: nowIso(),
          };
          set((state) => ({
            records: [record, ...state.records],
            pets: state.pets.map((pet) =>
              pet.id === record.petId && record.weightKg
                ? { ...pet, weightKg: record.weightKg, updatedAt: nowIso() }
                : pet,
            ),
          }));
          get().track("health_record_created", { type: record.type });
          get().sweepNotifications();
          return record.id;
        },

        updateRecord: (recordId, patch) =>
          set((state) => ({
            records: state.records.map((record) =>
              record.id === recordId ? { ...record, ...patch } : record,
            ),
          })),

        removeRecord: (recordId) =>
          set((state) => ({
            records: state.records.filter((record) => record.id !== recordId),
            snoozes: Object.fromEntries(
              Object.entries(state.snoozes).filter(
                ([key]) => !key.endsWith(recordId),
              ),
            ),
          })),

        addReminder: (input) => {
          const reminder: Reminder = {
            ...input,
            id: newId("reminder"),
            done: input.done ?? false,
            createdAt: nowIso(),
          };
          set((state) => ({ reminders: [reminder, ...state.reminders] }));
          get().track("reminder_created", { kind: reminder.kind });
          get().sweepNotifications();
          return reminder.id;
        },

        updateReminder: (reminderId, patch) =>
          set((state) => ({
            reminders: state.reminders.map((reminder) =>
              reminder.id === reminderId ? { ...reminder, ...patch } : reminder,
            ),
          })),

        removeReminder: (reminderId) =>
          set((state) => ({
            reminders: state.reminders.filter(
              (reminder) => reminder.id !== reminderId,
            ),
            snoozes: Object.fromEntries(
              Object.entries(state.snoozes).filter(
                ([key]) => !key.endsWith(reminderId),
              ),
            ),
          })),

        completeReminderItem: (item) => {
          const today = todayKey();
          if (item.source === "manual") {
            set((state) => ({
              reminders: state.reminders.map((reminder) =>
                reminder.id === item.id
                  ? { ...reminder, done: true }
                  : reminder,
              ),
            }));
          } else {
            const record = get().records.find((entry) => entry.id === item.id);
            if (!record) return;
            const months = record.recurrenceMonths;
            const nextRecord: HealthRecord = {
              ...record,
              id: newId("record"),
              title: record.title,
              date: today,
              nextDueDate: months ? addMonthsToKey(today, months) : null,
              leadDays: record.leadDays,
              completedAt: null,
              attachmentData: null,
              attachmentName: null,
              createdAt: nowIso(),
            };
            set((state) => ({
              records: [
                nextRecord,
                ...state.records.map((entry) =>
                  entry.id === record.id
                    ? { ...entry, nextDueDate: null, completedAt: nowIso() }
                    : entry,
                ),
              ],
              snoozes: Object.fromEntries(
                Object.entries(state.snoozes).filter(
                  ([key]) => !key.endsWith(record.id),
                ),
              ),
            }));
          }
          get().track("reminder_completed", { source: item.source });
          get().sweepNotifications();
        },

        snoozeReminderItem: (item, days) => {
          const until = snoozeUntil(days);
          set((state) => ({
            snoozes: { ...state.snoozes, [item.key]: until },
          }));
          get().track("reminder_snoozed", { days });
        },

        addDiaryEntry: (input) => {
          const entry: DiaryEntry = {
            ...input,
            id: newId("diary"),
            createdAt: nowIso(),
          };
          set((state) => ({
            diary: [entry, ...state.diary],
            pets:
              input.weightKg !== null
                ? state.pets.map((pet) =>
                    pet.id === entry.petId
                      ? {
                          ...pet,
                          weightKg: input.weightKg,
                          updatedAt: nowIso(),
                        }
                      : pet,
                  )
                : state.pets,
          }));
          get().track("diary_entry_created", { visibility: entry.visibility });
          return entry.id;
        },

        updateDiaryEntry: (entryId, patch) =>
          set((state) => ({
            diary: state.diary.map((entry) =>
              entry.id === entryId ? { ...entry, ...patch } : entry,
            ),
          })),

        removeDiaryEntry: (entryId) =>
          set((state) => ({
            diary: state.diary.filter((entry) => entry.id !== entryId),
          })),

        addPlace: (input) => {
          const place: Place = { ...input, id: newId("place"), seeded: false };
          set((state) => ({ places: [place, ...state.places] }));
          return place.id;
        },

        addReview: (input) => {
          const review: Review = {
            ...input,
            id: newId("review"),
            authorName: input.authorName ?? get().tutor?.name ?? "Você",
            createdAt: nowIso(),
          };
          set((state) => ({ reviews: [review, ...state.reviews] }));
        },

        addPost: (input) => {
          const post: Post = {
            ...input,
            id: newId("post"),
            authorId: MY_AUTHOR_ID,
            authorName: get().tutor?.name ?? "Você",
            createdAt: nowIso(),
            helpfulCount: 0,
            reported: false,
            hidden: false,
          };
          set((state) => ({ posts: [post, ...state.posts] }));
          get().track("post_created", { type: post.type });
          return post.id;
        },

        removePost: (postId) =>
          set((state) => ({
            posts: state.posts.filter((post) => post.id !== postId),
            comments: state.comments.filter(
              (comment) => comment.postId !== postId,
            ),
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
          set((state) => ({ comments: [comment, ...state.comments] }));
          get().track("comment_created", { postId: comment.postId });
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

        sweepNotifications: () =>
          set((state) => {
            const incoming = deriveNotifications({
              pets: state.pets,
              records: state.records,
              reminders: state.reminders,
              places: state.places,
              products: state.products,
              enabled: state.settings.notifications,
            });
            return {
              notifications: mergeNotifications(state.notifications, incoming),
              lastSweepAt: nowIso(),
            };
          }),

        markReady: () => set({ ready: true }),

        track: (name, props) =>
          set((state) => ({ events: recordEvent(state.events, name, props) })),
      };
    },
    {
      name: "pethub-store",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : window.localStorage,
      ),
      skipHydration: true,
      partialize: (state) => ({
        tutor: state.tutor,
        pets: state.pets,
        activePetId: state.activePetId,
        records: state.records,
        reminders: state.reminders,
        snoozes: state.snoozes,
        diary: state.diary,
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
      }),
    },
  ),
);

export const MY_AUTHOR = MY_AUTHOR_ID;

export function seedIfNeeded() {
  const state = useAppStore.getState();
  if (state.seededAt) return;
  useAppStore.setState({
    places: seedPlaces,
    groups: seedGroups,
    products: seedProducts,
    posts: seedPosts,
    comments: seedComments,
    reviews: seedReviews,
    seededAt: nowIso(),
  });
}

export function exportSnapshot(): string {
  const state = useAppStore.getState();
  return JSON.stringify(
    {
      exportedAt: nowIso(),
      tutor: state.tutor,
      pets: state.pets,
      records: state.records,
      reminders: state.reminders,
      diary: state.diary,
      reviews: state.reviews.filter(
        (review) => review.authorName === state.tutor?.name,
      ),
      posts: state.posts.filter((post) => post.authorId === MY_AUTHOR_ID),
      settings: state.settings,
    },
    null,
    2,
  );
}
