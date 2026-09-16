import {
  BadgeCheck,
  Bell,
  CalendarDays,
  ClipboardList,
  Dog,
  Heart,
  Hotel,
  Image as ImageIcon,
  MapPin,
  Megaphone,
  MessageCircle,
  NotebookPen,
  Pill,
  Scale,
  Scissors,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
  Syringe,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import type {
  HealthRecordType,
  NotificationKind,
  PlaceCategory,
  PostType,
} from "@/lib/domain/schema";

export const healthTypeIcons: Record<HealthRecordType, LucideIcon> = {
  vacina: Syringe,
  vermifugo: Pill,
  antiparasitario: ShieldCheck,
  medicamento: Pill,
  consulta: Stethoscope,
  exame: ClipboardList,
  peso: Scale,
  observacao: NotebookPen,
};

export const placeCategoryIcons: Record<PlaceCategory, LucideIcon> = {
  parque: Heart,
  restaurante: Utensils,
  veterinario: Stethoscope,
  banho_tosa: Scissors,
  hospedagem: Hotel,
  passeador_adestrador: Dog,
};

export const postTypeIcons: Record<PostType, LucideIcon> = {
  pergunta: MessageCircle,
  recomendacao: BadgeCheck,
  diario_publico: ImageIcon,
  perdido_encontrado: Siren,
  evento: CalendarDays,
  dica: Sparkles,
};

export const notificationIcons: Record<NotificationKind, LucideIcon> = {
  prevencao: Syringe,
  rotina: Bell,
  social: Users,
  local: MapPin,
  comercial: Megaphone,
};
