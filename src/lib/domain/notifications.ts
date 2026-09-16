import { formatShortDate, todayKey } from "./dates";
import { urgencyFor, urgencyText } from "./health";
import { isValidDateKey } from "./dates";
import type {
  AppNotification,
  HealthRecord,
  NotificationKind,
  Pet,
  Place,
  Product,
  Reminder,
} from "./schema";

export type NotificationSettings = Record<NotificationKind, boolean>;

function notification(
  id: string,
  kind: NotificationKind,
  title: string,
  body: string,
  href: string | null,
  createdAt: string,
): AppNotification {
  return {
    id,
    kind,
    title,
    body,
    href,
    createdAt,
    readAt: null,
    dismissed: false,
  };
}

export function deriveNotifications(input: {
  pets: Pet[];
  records: HealthRecord[];
  reminders: Reminder[];
  places: Place[];
  products: Product[];
  enabled: NotificationSettings;
  now?: Date;
}): AppNotification[] {
  const now = input.now ?? new Date();
  const createdAt = now.toISOString();
  const petById = new Map(input.pets.map((pet) => [pet.id, pet]));
  const created: AppNotification[] = [];

  if (input.enabled.prevencao) {
    for (const record of input.records) {
      if (!isValidDateKey(record.nextDueDate)) continue;
      const pet = petById.get(record.petId);
      if (!pet) continue;
      const { urgency, days } = urgencyFor(
        record.nextDueDate as string,
        record.leadDays,
        now,
      );
      if (urgency === "futuro") continue;
      created.push(
        notification(
          `notif-prevencao-${record.id}-${record.nextDueDate}`,
          "prevencao",
          urgency === "vencido"
            ? `${record.title} vencido`
            : `${record.title} chegando`,
          urgency === "vencido"
            ? `O ${record.title.toLowerCase()} de ${pet.name} venceu em ${formatShortDate(
                record.nextDueDate as string,
              )}.`
            : `O ${record.title.toLowerCase()} de ${pet.name} ${urgencyText(days)}.`,
          `/reminders`,
          createdAt,
        ),
      );
    }
  }

  if (input.enabled.rotina) {
    const today = todayKey(now);
    for (const record of input.records) {
      const pet = petById.get(record.petId);
      if (!pet || record.type !== "medicamento") continue;
      if (record.nextDueDate !== today) continue;
      created.push(
        notification(
          `notif-rotina-${record.id}-${today}`,
          "rotina",
          `Medicação de ${pet.name} hoje`,
          record.notes
            ? record.notes
            : `Confira a dose combinada para ${record.title.toLowerCase()}.`,
          `/reminders`,
          createdAt,
        ),
      );
    }
    for (const reminder of input.reminders) {
      if (reminder.done || reminder.dueDate !== today) continue;
      const pet = petById.get(reminder.petId);
      if (!pet) continue;
      created.push(
        notification(
          `notif-rotina-${reminder.id}-${today}`,
          "rotina",
          `${reminder.title} hoje`,
          `Tarefa de rotina de ${pet.name}.`,
          `/reminders`,
          createdAt,
        ),
      );
    }
  }

  if (input.enabled.local && input.places.length > 0) {
    const highlights = input.places.slice(0, 3);
    created.push(
      notification(
        `notif-local-${highlights.map((place) => place.id).join("-")}`,
        "local",
        `${highlights.length} lugares pet-friendly perto de você`,
        highlights.map((place) => place.name).join(", "),
        `/explore`,
        createdAt,
      ),
    );
  }

  if (input.enabled.comercial && input.products.length > 0) {
    const product = input.products[0];
    created.push(
      notification(
        `notif-comercial-${product.id}`,
        "comercial",
        "Oferta de parceiro",
        `Conteúdo comercial: ${product.name} na ${product.partnerName}.`,
        `/products`,
        createdAt,
      ),
    );
  }

  return created;
}

export function mergeNotifications(
  existing: AppNotification[],
  incoming: AppNotification[],
  limit = 40,
): AppNotification[] {
  const known = new Set(existing.map((item) => item.id));
  const fresh = incoming.filter((item) => !known.has(item.id));
  if (fresh.length === 0) return existing;
  return [...fresh, ...existing]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function unreadCount(notifications: AppNotification[]): number {
  return notifications.filter((item) => !item.readAt && !item.dismissed).length;
}
