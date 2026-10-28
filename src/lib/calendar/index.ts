import {
  formatShortDate,
  isValidDateKey,
  shiftDays,
  todayKey,
} from "@/lib/domain/dates";
import { healthTypeMeta } from "@/lib/domain/labels";
import type { HealthRecord, Pet, Reminder } from "@/lib/domain/schema";
import type { ReminderItem } from "@/lib/domain/reminders";

export type CalendarAlarm = {
  /** Minutes before the event start when alarm should trigger (e.g. 1440 for 1 day, 120 for 2 hours) */
  minutesBefore: number;
  description?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string | null; // HH:mm or null for all-day
  endDate?: string | null; // YYYY-MM-DD
  endTime?: string | null; // HH:mm
  location?: string | null;
  petName?: string;
  category?: string;
  alarms?: CalendarAlarm[];
};

/**
 * Escapes characters per RFC 5545 specifications:
 * backslash, semicolon, comma and newlines.
 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/**
 * Folds lines to max 75 octets per RFC 5545 section 3.1.
 * Continuation lines begin with a space.
 */
export function foldIcsLine(line: string, maxOctets = 74): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= maxOctets) return line;

  const parts: string[] = [];
  let currentOffset = 0;
  let isFirst = true;

  while (currentOffset < line.length) {
    const limit = isFirst ? maxOctets : maxOctets - 1; // space prefix counts as 1 byte
    let sliceLength = 0;
    let byteCount = 0;

    while (currentOffset + sliceLength < line.length) {
      const char = line[currentOffset + sliceLength];
      const charBytes = new TextEncoder().encode(char).length;
      if (byteCount + charBytes > limit) break;
      byteCount += charBytes;
      sliceLength++;
    }

    if (sliceLength === 0) {
      // Safety edge case: at least 1 character must advance
      sliceLength = 1;
    }

    const chunk = line.slice(currentOffset, currentOffset + sliceLength);
    parts.push(isFirst ? chunk : ` ${chunk}`);
    isFirst = false;
    currentOffset += sliceLength;
  }

  return parts.join("\r\n");
}

function formatCompactDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function formatCompactTime(timeStr: string): string {
  return timeStr.replace(/:/g, "");
}

/**
 * Converts alarm minutes to RFC 5545 duration string.
 * Example: 1440 min -> -P1D, 120 min -> -PT2H, 45 min -> -PT45M.
 */
export function formatIcsAlarmTrigger(minutes: number): string {
  const abs = Math.abs(minutes);
  if (abs >= 1440 && abs % 1440 === 0) {
    return `-P${abs / 1440}D`;
  }
  if (abs >= 60 && abs % 60 === 0) {
    return `-PT${abs / 60}H`;
  }
  return `-PT${abs}M`;
}

/**
 * Generates RFC 5545 compliant .ics content for one or multiple events.
 */
export function generateIcs(
  events: CalendarEvent | CalendarEvent[],
  calendarName = "Zelupi — Cuidados Pet",
  now = new Date(),
): string {
  const eventList = Array.isArray(events) ? events : [events];
  const dtstamp =
    now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zelupi//Cuidados Pet//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
  ];

  for (const event of eventList) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@zelupi.app`);
    lines.push(`DTSTAMP:${dtstamp}`);

    if (event.startTime) {
      const startCompact = formatCompactDate(event.startDate);
      const timeCompact = formatCompactTime(event.startTime);
      lines.push(`DTSTART:${startCompact}T${timeCompact}00`);

      const endDate = event.endDate ?? event.startDate;
      const endTime = event.endTime ?? shiftTimeOneHour(event.startTime);
      const endCompact = formatCompactDate(endDate);
      const endTimeCompact = formatCompactTime(endTime);
      lines.push(`DTEND:${endCompact}T${endTimeCompact}00`);
    } else {
      // All-day event: DTEND is exclusive (day after startDate) per RFC 5545
      const startCompact = formatCompactDate(event.startDate);
      const nextDay = shiftDays(event.startDate, 1);
      const endCompact = formatCompactDate(event.endDate ? shiftDays(event.endDate, 1) : nextDay);
      lines.push(`DTSTART;VALUE=DATE:${startCompact}`);
      lines.push(`DTEND;VALUE=DATE:${endCompact}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);

    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    }

    if (event.category) {
      lines.push(`CATEGORIES:${escapeIcsText(event.category)}`);
    }

    lines.push("STATUS:CONFIRMED");

    // Alarms (notifications)
    const alarms = event.alarms ?? [
      { minutesBefore: 1440, description: `Amanhã: ${event.title}` },
      { minutesBefore: 120, description: `Em 2 horas: ${event.title}` },
    ];

    for (const alarm of alarms) {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(
        `DESCRIPTION:${escapeIcsText(alarm.description ?? event.title)}`,
      );
      lines.push(`TRIGGER:${formatIcsAlarmTrigger(alarm.minutesBefore)}`);
      lines.push("END:VALARM");
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // Fold long lines and join with standard CRLF
  return lines.map((line) => foldIcsLine(line)).join("\r\n") + "\r\n";
}

function shiftTimeOneHour(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const nextHour = (h + 1) % 24;
  return `${String(nextHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Builds a direct Google Calendar web URL to add an event.
 */
export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(event.description);
  const location = encodeURIComponent(event.location ?? "");

  let datesParam: string;
  if (event.startTime) {
    const startCompact = formatCompactDate(event.startDate);
    const timeCompact = formatCompactTime(event.startTime);
    const endDate = event.endDate ?? event.startDate;
    const endTime = event.endTime ?? shiftTimeOneHour(event.startTime);
    const endCompact = formatCompactDate(endDate);
    const endTimeCompact = formatCompactTime(endTime);
    datesParam = `${startCompact}T${timeCompact}00/${endCompact}T${endTimeCompact}00`;
  } else {
    // All day in Google Calendar: exclusive end date
    const startCompact = formatCompactDate(event.startDate);
    const nextDay = shiftDays(event.startDate, 1);
    const endCompact = formatCompactDate(event.endDate ? shiftDays(event.endDate, 1) : nextDay);
    datesParam = `${startCompact}/${endCompact}`;
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
}

/**
 * Creates a CalendarEvent from a HealthRecord (vacina, vermifugo, consulta, etc.).
 */
export function createCalendarEventFromRecord(
  record: HealthRecord,
  pet?: Pick<Pet, "name"> | null,
): CalendarEvent | null {
  const targetDate = record.nextDueDate ?? record.date;
  if (!isValidDateKey(targetDate)) return null;

  const petName = pet?.name ?? "Pet";
  const typeLabel = healthTypeMeta[record.type]?.label ?? "Cuidado";

  // Title formatting
  const title = `${typeLabel}: ${record.title} (${petName}) — Zelupi`;

  // Rich description with details
  const descParts: string[] = [
    `📅 ${typeLabel}: ${record.title}`,
    `🐾 Pet: ${petName}`,
    `🗓️ Data prevista: ${formatShortDate(targetDate)}`,
  ];

  const activeSchedule = record.medication?.schedules.find(
    (s) => s.id === record.medication?.activeScheduleId,
  ) ?? record.medication?.schedules[0];
  const dose = activeSchedule
    ? `${activeSchedule.amount} ${activeSchedule.unit}`
    : ((record as Record<string, unknown>).dose as string | undefined) ?? null;
  if (dose) {
    descParts.push(`💊 Dose: ${dose}`);
  }
  if (record.batchNumber) {
    descParts.push(`🏷️ Lote: ${record.batchNumber}`);
  }
  if (record.professional) {
    descParts.push(`👨‍⚕️ Veterinário: ${record.professional}`);
  }
  const clinic = ((record as Record<string, unknown>).clinic as string | undefined) ?? null;
  if (clinic) {
    descParts.push(`🏥 Clínica: ${clinic}`);
  }
  if (record.notes) {
    descParts.push(`📝 Observações: ${record.notes}`);
  }

  descParts.push(
    "",
    "⭐ Organizado com Zelupi — Cuidados com seu pet",
    "https://zelupi.app",
  );

  return {
    id: `zelupi-record-${record.id}-${targetDate}`,
    title,
    description: descParts.join("\n"),
    startDate: targetDate,
    startTime: null,
    location: clinic ?? (record.professional ? `Dr(a). ${record.professional}` : null),
    petName,
    category: record.type,
    alarms: [
      { minutesBefore: 1440, description: `Amanhã: ${typeLabel} de ${petName}` },
      { minutesBefore: 120, description: `Hoje em 2h: ${typeLabel} de ${petName}` },
    ],
  };
}

/**
 * Creates a CalendarEvent from a ReminderItem (agenda item).
 */
export function createCalendarEventFromReminder(
  item: ReminderItem,
  pet?: Pick<Pet, "name"> | null,
  record?: HealthRecord | null,
): CalendarEvent {
  const petName = pet?.name ?? item.petName;
  const careType = record?.type ?? "cuidado";
  const typeLabel = record ? healthTypeMeta[record.type]?.label : "Lembrete";

  const title = `${typeLabel}: ${item.title} (${petName}) — Zelupi`;

  const descParts: string[] = [
    `📅 ${typeLabel}: ${item.title}`,
    `🐾 Pet: ${petName}`,
    `🗓️ Data prevista: ${formatShortDate(item.dueDate)}`,
  ];

  if (item.medication) {
    descParts.push(
      `💊 Dose: ${item.medication.amount} ${item.medication.unit} às ${item.medication.time}`,
    );
  }
  const recordClinic = ((record as Record<string, unknown> | null | undefined)?.clinic as string | undefined) ?? null;
  if (recordClinic) {
    descParts.push(`🏥 Clínica: ${recordClinic}`);
  }
  if (record?.professional) {
    descParts.push(`👨‍⚕️ Veterinário: ${record.professional}`);
  }
  if (item.notes) {
    descParts.push(`📝 Observações: ${item.notes}`);
  }

  descParts.push(
    "",
    "⭐ Organizado com Zelupi — Cuidados com seu pet",
    "https://zelupi.app",
  );

  return {
    id: `zelupi-reminder-${item.id}-${item.dueDate}`,
    title,
    description: descParts.join("\n"),
    startDate: item.dueDate,
    startTime: item.medication?.time ?? null,
    location: recordClinic ?? null,
    petName,
    category: careType,
    alarms: [
      { minutesBefore: 1440, description: `Amanhã: ${item.title} (${petName})` },
      { minutesBefore: 120, description: `Em 2 horas: ${item.title} (${petName})` },
    ],
  };
}

/**
 * Collects upcoming care events (vacinas, vermífugos, consultas e lembretes) for bulk calendar export.
 */
export function createBulkCalendarEvents(input: {
  records: HealthRecord[];
  reminders?: Reminder[];
  pets: Pet[];
  filterTypes?: string[];
  referenceDate?: string;
}): CalendarEvent[] {
  const petsById = new Map(input.pets.map((p) => [p.id, p]));
  const refDate = input.referenceDate ?? todayKey();
  const allowedTypes = new Set(
    input.filterTypes ?? ["vacina", "vermifugo", "antiparasitario", "consulta", "exame"],
  );

  const events: CalendarEvent[] = [];

  for (const record of input.records) {
    if (!allowedTypes.has(record.type)) continue;
    const pet = petsById.get(record.petId);
    const date = record.nextDueDate ?? (record.date >= refDate ? record.date : null);
    if (!date || date < refDate) continue;

    const event = createCalendarEventFromRecord(record, pet);
    if (event) {
      events.push(event);
    }
  }

  if (input.reminders) {
    for (const reminder of input.reminders) {
      if (reminder.done || reminder.dueDate < refDate) continue;
      const pet = petsById.get(reminder.petId);
      const petName = pet?.name ?? "Pet";
      events.push({
        id: `zelupi-manual-${reminder.id}-${reminder.dueDate}`,
        title: `Lembrete: ${reminder.title} (${petName}) — Zelupi`,
        description: `Lembrete para ${petName}: ${reminder.title}\n${reminder.notes ?? ""}\n\nOrganizado com Zelupi`,
        startDate: reminder.dueDate,
        startTime: null,
        petName,
        category: "rotina",
        alarms: [
          { minutesBefore: 1440, description: `Amanhã: ${reminder.title} (${petName})` },
          { minutesBefore: 120, description: `Hoje em 2h: ${reminder.title} (${petName})` },
        ],
      });
    }
  }

  // Sort chronologically
  return events.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));
}
