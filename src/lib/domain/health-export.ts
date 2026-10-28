import { brandColors } from "@/lib/brand";
import { z } from "zod";
import { formatDateTimeShort, formatShortDate } from "./dates";
import { healthTypeMeta, speciesLabels } from "./labels";
import { medicationDoseStatusLabels } from "./medication";
import {
  healthRecordTypeSchema,
  isoDate,
  type HealthRecord,
  type Pet,
} from "./schema";

export const healthExportFiltersSchema = z
  .object({
    fromDate: isoDate.optional(),
    toDate: isoDate.optional(),
    types: z
      .array(healthRecordTypeSchema)
      .min(1, "Escolha ao menos um tipo de cuidado.")
      .optional(),
  })
  .superRefine((filters, context) => {
    if (
      filters.fromDate &&
      filters.toDate &&
      filters.fromDate > filters.toDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "A data final deve ser igual ou posterior à data inicial.",
      });
    }
  });

export type HealthExportFilters = z.infer<typeof healthExportFiltersSchema>;

export function selectHealthExportRecords(
  petId: string,
  records: HealthRecord[],
  input: HealthExportFilters = {},
): HealthRecord[] {
  const filters = healthExportFiltersSchema.parse(input);
  return records
    .filter(
      (record) =>
        record.petId === petId &&
        (!filters.fromDate || record.date >= filters.fromDate) &&
        (!filters.toDate || record.date <= filters.toDate) &&
        (!filters.types || filters.types.includes(record.type)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

/** A portable, printable report containing only the selected pet's records. */
export function healthReportHtml(
  pet: Pet,
  records: HealthRecord[],
  now = new Date(),
  input: HealthExportFilters = {},
): string {
  const filters = healthExportFiltersSchema.parse(input);
  const history = selectHealthExportRecords(pet.id, records, filters);
  const period =
    filters.fromDate || filters.toDate
      ? `${filters.fromDate ? formatShortDate(filters.fromDate) : "Início do histórico"} até ${filters.toDate ? formatShortDate(filters.toDate) : "Último registro"}`
      : "Todo o período";
  const typeSummary = filters.types
    ? [...new Set(filters.types)]
        .map((type) => healthTypeMeta[type].label)
        .join(", ")
    : "Todos os tipos de cuidado";
  const details = [
    speciesLabels[pet.species],
    pet.breed,
    pet.birthDate ? `Nascimento: ${formatShortDate(pet.birthDate)}` : null,
    pet.microchip ? `Microchip: ${pet.microchip}` : null,
  ]
    .filter(Boolean)
    .map((value) => escapeHtml(value!))
    .join(" · ");
  const sections = history
    .map((record) => {
      const rows = [
        ["Tipo", healthTypeMeta[record.type].label],
        ["Data do cuidado", formatShortDate(record.date)],
        ...(record.nextDueDate
          ? [["Próxima data", formatShortDate(record.nextDueDate)]]
          : []),
        ...(record.completedAt
          ? [["Ciclo concluído em", formatDateTimeShort(record.completedAt)]]
          : []),
        ...(record.professional
          ? [["Profissional ou local", record.professional]]
          : []),
        ...(record.weightKg !== null
          ? [["Peso", `${record.weightKg.toLocaleString("pt-BR")} kg`]]
          : []),
        ...(record.notes ? [["Observações", record.notes]] : []),
        ...(record.attachmentName
          ? [
              [
                "Anexo",
                `${record.attachmentName} (imagem disponível na Zelupi; não incluída neste resumo)`,
              ],
            ]
          : []),
      ];
      const medication = record.medication;
      const plans = medication
        ? `<h3>Planos de medicação informados</h3>${medication.schedules.map((plan) => `<p><strong>${escapeHtml(`${plan.amount} ${plan.unit}`)}</strong> · ${escapeHtml(plan.times.join(", "))} · a cada ${plan.everyDays} dia(s) de calendário · ${escapeHtml(plan.timeZone)}<br>Início: ${escapeHtml(formatShortDate(plan.startsOn))} · Último dia: ${plan.endsOn ? escapeHtml(formatShortDate(plan.endsOn)) : "não informado"}<br>Origem: ${escapeHtml(plan.source)}${plan.instructions ? `<br>Instruções: ${escapeHtml(plan.instructions)}` : ""}<br>${plan.closedAt ? `Encerrado em ${escapeHtml(formatDateTimeShort(plan.closedAt))}` : "Plano ativo"}</p>`).join("")}`
        : "";
      const doses = medication
        ? `<h3>Registros de doses e correções</h3><p class="meta">Ausência de registro não confirma administração. Correções preservam os eventos anteriores; o último evento de cada horário é a situação atual.</p>${
            medication.events.length
              ? `<ol>${medication.events
                  .map((event) => {
                    const plan = medication.schedules.find(
                      (entry) => entry.id === event.scheduleId,
                    )!;
                    return `<li>${escapeHtml(formatShortDate(event.date))} às ${escapeHtml(event.time)} (${escapeHtml(plan.timeZone)}) · ${escapeHtml(`${plan.amount} ${plan.unit}`)} · <strong>${escapeHtml(medicationDoseStatusLabels[event.status])}</strong><br>${event.correctsId ? "Correção registrada" : "Registrado"} em ${escapeHtml(formatDateTimeShort(event.recordedAt))}${event.note ? `<br>${escapeHtml(event.note)}` : ""}</li>`;
                  })
                  .join("")}</ol>`
              : "<p>Nenhuma dose confirmada.</p>"
          }`
        : "";
      return `<section><h2>${escapeHtml(record.title)}</h2><dl>${rows.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>${plans}${doses}</section>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Histórico de ${escapeHtml(pet.name)} — Zelupi</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 24px;color:${brandColors.ink};background:#fff}h1{line-height:1.2}h2{font-size:20px;margin:0 0 12px}header{border-bottom:2px solid ${brandColors.brand};padding-bottom:20px}section{margin:24px 0;padding-bottom:24px;border-bottom:1px solid ${brandColors.line};break-inside:avoid}dl{display:grid;grid-template-columns:minmax(130px,1fr) 3fr;gap:6px 20px;margin:0}dt{font-weight:600}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}footer,.meta{font-size:14px;color:#596877}@media(max-width:480px){dl{display:block}dd{margin-bottom:12px}}@media print{body{margin:0;max-width:none;padding:0;font-size:11pt}.instructions{display:none}@page{size:A4;margin:18mm}}</style></head>
<body><header><p class="meta">Zelupi · Histórico de saúde</p><h1>${escapeHtml(pet.name)}</h1><p>${details}</p><p class="meta">Gerado em ${escapeHtml(formatDateTimeShort(now.toISOString()))} · ${history.length} registro(s)</p><p class="meta">${escapeHtml(period)} · ${escapeHtml(typeSummary)}</p></header>
<p class="instructions">Use a opção Imprimir do navegador para imprimir este resumo ou salvá-lo como PDF.</p>
${sections || "<p>Nenhum cuidado registrado.</p>"}
<footer>Informações registradas pelo tutor, sem validação clínica. Este resumo não substitui a carteirinha oficial, receitas ou avaliação veterinária. Compartilhe somente com quem você escolher.</footer></body></html>`;
}
