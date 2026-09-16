import { beforeEach, describe, expect, it } from "vitest";

import { addMonthsToKey, shiftDays, todayKey } from "@/lib/domain/dates";
import { buildReminders } from "@/lib/domain/reminders";
import { emptyFilters, filterPlaces } from "@/lib/domain/places";
import { visiblePosts } from "@/lib/domain/community";
import {
  exportSnapshot,
  MY_AUTHOR,
  seedIfNeeded,
  useAppStore,
} from "./app-store";

const NOW = new Date();

function resetStore() {
  useAppStore.setState(useAppStore.getInitialState(), true);
  useAppStore.getState().markReady();
}

function createPet() {
  return useAppStore.getState().addPet({
    name: "Thor",
    species: "cao",
    breed: "Golden Retriever",
    sex: "macho",
    birthDate: "2023-03-10",
    weightKg: 31.4,
    routine: ["passeio"],
  });
}

describe("store do PetHub", () => {
  beforeEach(() => {
    resetStore();
  });

  it("cria o pet e o mantém ativo", () => {
    const petId = createPet();
    const state = useAppStore.getState();
    expect(state.pets).toHaveLength(1);
    expect(state.activePetId).toBe(petId);
    expect(state.events[0].name).toBe("pet_created");
  });

  it("completa o onboarding com tutor, pet e cidade", () => {
    useAppStore.getState().completeOnboarding({
      tutorName: "João",
      email: null,
      city: "São Paulo",
      focusAreas: ["saude"],
      pet: {
        name: "Nina",
        species: "cao",
        sex: "femea",
        birthDate: "2024-01-01",
      },
    });
    const state = useAppStore.getState();
    expect(state.tutor?.name).toBe("João");
    expect(state.pets[0].name).toBe("Nina");
    expect(
      state.events.some((event) => event.name === "onboarding_completed"),
    ).toBe(true);
  });

  it("atualiza o peso do pet ao registrar uma pesagem", () => {
    const petId = createPet();
    useAppStore.getState().addRecord({
      petId,
      type: "peso",
      title: "Pesagem mensal",
      date: todayKey(),
      nextDueDate: null,
      leadDays: 0,
      recurrenceMonths: null,
      professional: null,
      notes: null,
      attachmentName: null,
      attachmentData: null,
      weightKg: 32.1,
    });
    expect(useAppStore.getState().pets[0].weightKg).toBe(32.1);
  });

  it("conclui um lembrete de vacina criando o próximo ciclo", () => {
    const petId = createPet();
    const overdue = shiftDays(todayKey(), -5);
    const recordId = useAppStore.getState().addRecord({
      petId,
      type: "vacina",
      title: "Vacina V10",
      date: "2025-09-20",
      nextDueDate: overdue,
      leadDays: 30,
      recurrenceMonths: 12,
      professional: null,
      notes: null,
      attachmentName: null,
      attachmentData: null,
      weightKg: null,
    });

    const [item] = buildReminders({
      pets: useAppStore.getState().pets,
      records: useAppStore.getState().records,
      reminders: [],
      snoozes: {},
    });
    expect(item.urgency).toBe("vencido");

    useAppStore.getState().completeReminderItem(item);

    const state = useAppStore.getState();
    const original = state.records.find((record) => record.id === recordId);
    const created = state.records.find((record) => record.id !== recordId);
    expect(original?.nextDueDate).toBeNull();
    expect(original?.completedAt).not.toBeNull();
    expect(created?.date).toBe(todayKey());
    expect(created?.nextDueDate).toBe(addMonthsToKey(todayKey(), 12));
    expect(state.events[0].name).toBe("reminder_completed");
  });

  it("conclui um lembrete manual sem criar novo registro", () => {
    const petId = createPet();
    const reminderId = useAppStore.getState().addReminder({
      petId,
      title: "Comprar ração",
      kind: "outro",
      dueDate: todayKey(NOW),
      leadDays: 3,
      notes: null,
    });
    const [item] = buildReminders({
      pets: useAppStore.getState().pets,
      records: [],
      reminders: useAppStore.getState().reminders,
      snoozes: {},
    });
    useAppStore.getState().completeReminderItem(item);
    const state = useAppStore.getState();
    expect(
      state.reminders.find((reminder) => reminder.id === reminderId)?.done,
    ).toBe(true);
    expect(state.records).toHaveLength(0);
  });

  it("adia um lembrete guardando a data de retorno", () => {
    const petId = createPet();
    useAppStore.getState().addReminder({
      petId,
      title: "Comprar ração",
      kind: "outro",
      dueDate: todayKey(NOW),
      leadDays: 3,
      notes: null,
    });
    const [item] = buildReminders({
      pets: useAppStore.getState().pets,
      records: [],
      reminders: useAppStore.getState().reminders,
      snoozes: {},
    });
    useAppStore.getState().snoozeReminderItem(item, 3);
    const state = useAppStore.getState();
    expect(state.snoozes[item.key]).toBeDefined();
    expect(state.events[0].name).toBe("reminder_snoozed");
  });

  it("remove o pet junto com os dados dependentes", () => {
    const petId = createPet();
    useAppStore.getState().addRecord({
      petId,
      type: "vacina",
      title: "Vacina V10",
      date: "2026-01-10",
      nextDueDate: "2027-01-10",
      leadDays: 30,
      recurrenceMonths: 12,
      professional: null,
      notes: null,
      attachmentName: null,
      attachmentData: null,
      weightKg: null,
    });
    useAppStore.getState().addDiaryEntry({
      petId,
      date: todayKey(),
      text: "Primeiro banho no pet shop novo.",
      photo: null,
      tags: [],
      place: null,
      weightKg: null,
      visibility: "privado",
    });
    useAppStore.getState().removePet(petId);
    const state = useAppStore.getState();
    expect(state.pets).toHaveLength(0);
    expect(state.records).toHaveLength(0);
    expect(state.diary).toHaveLength(0);
    expect(state.activePetId).toBeNull();
  });

  it("carrega o conteúdo inicial uma única vez", () => {
    seedIfNeeded();
    const places = useAppStore.getState().places.length;
    seedIfNeeded();
    expect(useAppStore.getState().places).toHaveLength(places);
    expect(places).toBeGreaterThan(0);
  });

  it("permite explorar lugares e denunciar publicações", () => {
    seedIfNeeded();
    const places = filterPlaces(
      useAppStore.getState().places,
      { ...emptyFilters, categories: ["parque"] },
      { lat: -23.5614, lng: -46.6559 },
    );
    expect(places.length).toBeGreaterThan(0);

    const { posts } = useAppStore.getState();
    useAppStore.getState().reportPost(posts[0].id);
    const state = useAppStore.getState();
    expect(state.posts.find((post) => post.id === posts[0].id)?.reported).toBe(
      true,
    );
    expect(visiblePosts(state.posts).length).toBe(state.posts.length - 1);
  });

  it("registra publicação e comentário como o tutor local", () => {
    const postId = useAppStore.getState().addPost({
      petName: "Thor",
      type: "pergunta",
      groupId: null,
      title: "Onde passear no sábado?",
      body: "Procuro lugar com sombra.",
      city: "São Paulo",
    });
    useAppStore
      .getState()
      .addComment({ postId, body: "Parque das Figueiras!" });
    const state = useAppStore.getState();
    expect(state.posts[0].authorId).toBe(MY_AUTHOR);
    expect(state.comments[0].authorId).toBe(MY_AUTHOR);
    expect(state.comments[0].postId).toBe(postId);
  });

  it("mantém a fila de notificações sem duplicar", () => {
    const petId = createPet();
    seedIfNeeded();
    useAppStore.getState().addRecord({
      petId,
      type: "vacina",
      title: "Vacina V10",
      date: "2025-09-20",
      nextDueDate: todayKey(NOW),
      leadDays: 30,
      recurrenceMonths: 12,
      professional: null,
      notes: null,
      attachmentName: null,
      attachmentData: null,
      weightKg: null,
    });
    useAppStore.getState().sweepNotifications();
    const first = useAppStore.getState().notifications.length;
    useAppStore.getState().sweepNotifications();
    expect(useAppStore.getState().notifications.length).toBe(first);
    expect(first).toBeGreaterThan(0);
  });

  it("exporta os dados do tutor para atender a LGPD", () => {
    useAppStore.getState().completeOnboarding({
      tutorName: "João",
      email: "joao@exemplo.com",
      city: "São Paulo",
      focusAreas: ["saude", "rotina"],
      pet: { name: "Thor", species: "cao", sex: "macho" },
    });
    const snapshot = JSON.parse(exportSnapshot());
    expect(snapshot.tutor.name).toBe("João");
    expect(snapshot.pets).toHaveLength(1);
    expect(snapshot.exportedAt).toBeDefined();
  });

  it("apaga tudo ao excluir a conta", () => {
    createPet();
    useAppStore.getState().resetAll();
    const state = useAppStore.getState();
    expect(state.pets).toHaveLength(0);
    expect(state.tutor).toBeNull();
    expect(state.ready).toBe(true);
  });
});
