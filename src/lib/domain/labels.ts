import type {
  HealthRecordType,
  NotificationKind,
  PlaceAttribute,
  PlaceCategory,
  PostType,
  Species,
} from "./schema";

export type Tone = "teal" | "warning" | "danger" | "ink" | "muted";

export type HealthTypeMeta = {
  label: string;
  plural: string;
  tone: Tone;
  hasDue: boolean;
  defaultRecurrenceMonths: number | null;
  defaultLeadDays: number;
};

export const HEALTH_TYPES: HealthRecordType[] = [
  "vacina",
  "vermifugo",
  "antiparasitario",
  "medicamento",
  "consulta",
  "exame",
  "peso",
  "observacao",
];

export const healthTypeMeta: Record<HealthRecordType, HealthTypeMeta> = {
  vacina: {
    label: "Vacina",
    plural: "Vacinas",
    tone: "teal",
    hasDue: true,
    defaultRecurrenceMonths: 12,
    defaultLeadDays: 30,
  },
  vermifugo: {
    label: "Vermífugo",
    plural: "Vermífugos",
    tone: "teal",
    hasDue: true,
    defaultRecurrenceMonths: 3,
    defaultLeadDays: 15,
  },
  antiparasitario: {
    label: "Antiparasitário",
    plural: "Antiparasitários",
    tone: "teal",
    hasDue: true,
    defaultRecurrenceMonths: 1,
    defaultLeadDays: 7,
  },
  medicamento: {
    label: "Medicamento",
    plural: "Medicações",
    tone: "warning",
    hasDue: true,
    defaultRecurrenceMonths: null,
    defaultLeadDays: 1,
  },
  consulta: {
    label: "Consulta",
    plural: "Consultas",
    tone: "ink",
    hasDue: true,
    defaultRecurrenceMonths: 12,
    defaultLeadDays: 30,
  },
  exame: {
    label: "Exame",
    plural: "Exames",
    tone: "ink",
    hasDue: true,
    defaultRecurrenceMonths: null,
    defaultLeadDays: 30,
  },
  peso: {
    label: "Peso",
    plural: "Pesos",
    tone: "teal",
    hasDue: false,
    defaultRecurrenceMonths: null,
    defaultLeadDays: 0,
  },
  observacao: {
    label: "Observação",
    plural: "Observações",
    tone: "muted",
    hasDue: false,
    defaultRecurrenceMonths: null,
    defaultLeadDays: 0,
  },
};

export const placeCategoryMeta: Record<
  PlaceCategory,
  { label: string; plural: string; attributes: PlaceAttribute[]; hint: string }
> = {
  parque: {
    label: "Parque",
    plural: "Parques",
    attributes: ["aceita_caes", "area_cercada", "agua_disponivel", "sombra"],
    hint: "Área livre para gastar energia",
  },
  restaurante: {
    label: "Restaurante ou café",
    plural: "Restaurantes e cafés",
    attributes: [
      "area_externa",
      "agua_disponivel",
      "aceita_raca_grande",
      "ruido_alto",
    ],
    hint: "Onde vocês podem comer juntos",
  },
  veterinario: {
    label: "Veterinário",
    plural: "Veterinários",
    attributes: ["emergencia_24h", "equipe_paciente", "aceita_raca_grande"],
    hint: "Cuidado profissional",
  },
  banho_tosa: {
    label: "Banho e tosa",
    plural: "Banho e tosa",
    attributes: ["equipe_paciente", "aceita_raca_grande", "ruido_alto"],
    hint: "Higiene com menos estresse",
  },
  hospedagem: {
    label: "Hospedagem",
    plural: "Hospedagens",
    attributes: ["portoes_fechados", "area_cercada", "aceita_raca_grande"],
    hint: "Para quando você viaja",
  },
  passeador_adestrador: {
    label: "Passeador ou adestrador",
    plural: "Passeadores e adestradores",
    attributes: ["equipe_paciente", "aceita_raca_grande"],
    hint: "Apoio na rotina e no adestramento",
  },
};

export const placeAttributeLabels: Record<
  PlaceAttribute,
  { label: string; negative: boolean }
> = {
  aceita_caes: { label: "Aceita cães", negative: false },
  area_cercada: { label: "Área cercada", negative: false },
  agua_disponivel: { label: "Água disponível", negative: false },
  sombra: { label: "Tem sombra", negative: false },
  area_externa: { label: "Área externa", negative: false },
  aceita_raca_grande: { label: "Aceita porte grande", negative: false },
  equipe_paciente: { label: "Equipe paciente", negative: false },
  ruido_alto: { label: "Ruído alto", negative: true },
  emergencia_24h: { label: "Emergência 24h", negative: false },
  portoes_fechados: { label: "Portões fechados", negative: false },
};

export const REVIEW_CRITERIA: PlaceAttribute[] = [
  "aceita_raca_grande",
  "area_externa",
  "agua_disponivel",
  "equipe_paciente",
  "area_cercada",
  "sombra",
  "ruido_alto",
];

export const postTypeMeta: Record<PostType, { label: string; tone: Tone }> = {
  pergunta: { label: "Pergunta", tone: "teal" },
  recomendacao: { label: "Recomendação", tone: "teal" },
  diario_publico: { label: "Diário público", tone: "muted" },
  perdido_encontrado: { label: "Perdido ou encontrado", tone: "danger" },
  evento: { label: "Evento", tone: "ink" },
  dica: { label: "Dica da comunidade", tone: "warning" },
};

export const notificationKindMeta: Record<
  NotificationKind,
  { label: string; description: string }
> = {
  prevencao: { label: "Prevenção", description: "Vacinas e cuidados vencendo" },
  rotina: { label: "Rotina", description: "Medicação e tarefas do dia" },
  social: { label: "Social", description: "Respostas e interações" },
  local: { label: "Perto de você", description: "Lugares e serviços próximos" },
  comercial: {
    label: "Ofertas de parceiros",
    description: "Conteúdo identificado como comercial",
  },
};

export const speciesLabels: Record<Species, string> = {
  cao: "Cão",
  gato: "Gato",
  outro: "Outro",
};

export const speciesPluralLabels: Record<Species, string> = {
  cao: "Cães",
  gato: "Gatos",
  outro: "Outros",
};

export const sizeLabels: Record<string, string> = {
  mini: "Mini",
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  gigante: "Gigante",
};

export const lifeStageLabels: Record<string, string> = {
  filhote: "Filhote",
  adulto: "Adulto",
  idoso: "Idoso",
};

export const sexLabels: Record<string, string> = {
  macho: "Macho",
  femea: "Fêmea",
  nao_informado: "Não informado",
};

export const focusAreaLabels: Record<string, string> = {
  saude: "Saúde e prevenção",
  rotina: "Rotina e lembretes",
  lugares: "Lugares pet-friendly",
  comunidade: "Comunidade",
};

export const urgencyLabels: Record<string, string> = {
  vencido: "Vencido",
  hoje: "Hoje",
  proximo: "Próximo",
  futuro: "Em dia",
};
