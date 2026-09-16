export const ANALYTICS_EVENTS = [
  "onboarding_started",
  "onboarding_completed",
  "pet_created",
  "pet_completed",
  "health_record_created",
  "reminder_created",
  "reminder_completed",
  "reminder_snoozed",
  "diary_entry_created",
  "qr_shared",
  "qr_viewed",
  "explore_search",
  "place_view",
  "directions_clicked",
  "post_created",
  "comment_created",
  "product_view",
  "partner_click",
  "notification_opened",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export type AnalyticsProps = Record<string, string | number | boolean>;

export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEventName, string> = {
  onboarding_started: "Onboarding iniciado",
  onboarding_completed: "Onboarding concluído",
  pet_created: "Pet criado",
  pet_completed: "Perfil do pet completado",
  health_record_created: "Registro de saúde criado",
  reminder_created: "Lembrete criado",
  reminder_completed: "Lembrete concluído",
  reminder_snoozed: "Lembrete adiado",
  diary_entry_created: "Entrada no diário",
  qr_shared: "Carteirinha compartilhada",
  qr_viewed: "Carteirinha aberta",
  explore_search: "Busca no Explorar",
  place_view: "Local visualizado",
  directions_clicked: "Rota aberta",
  post_created: "Publicação criada",
  comment_created: "Comentário criado",
  product_view: "Produto visualizado",
  partner_click: "Parceiro clicado",
  notification_opened: "Notificação aberta",
};
