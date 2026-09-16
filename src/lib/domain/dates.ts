import {
  addMonths,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export function todayKey(now: Date = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toDate(key: string): Date {
  return parseISO(key);
}

export function isValidDateKey(key: string | null | undefined): boolean {
  if (!key) return false;
  return isValid(parseISO(key));
}

export function daysUntil(dueDate: string, now: Date = new Date()): number {
  return differenceInCalendarDays(parseISO(dueDate), now);
}

export function addMonthsToKey(key: string, months: number): string {
  return format(addMonths(parseISO(key), months), "yyyy-MM-dd");
}

export function shiftDays(key: string, days: number): string {
  const date = parseISO(key);
  date.setDate(date.getDate() + days);
  return format(date, "yyyy-MM-dd");
}

export function formatFullDate(key: string): string {
  return format(parseISO(key), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatShortDate(key: string): string {
  return format(parseISO(key), "dd/MM/yyyy");
}

export function formatDayMonth(key: string): string {
  return format(parseISO(key), "d 'de' MMM", { locale: ptBR });
}

export function formatMonthYear(key: string): string {
  return format(parseISO(key), "MMMM 'de' yyyy", { locale: ptBR });
}

export function formatDateTimeShort(iso: string): string {
  return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm");
}

export function relativeTimeLabel(iso: string, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = differenceInCalendarDays(now, new Date(iso));
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return formatShortDate(format(new Date(iso), "yyyy-MM-dd"));
}

export function monthDiff(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) -
    (to.getDate() < from.getDate() ? 1 : 0)
  );
}
