import { brandColors } from "@/lib/brand";
import { formatDateTimeShort, formatShortDate, todayKey } from "./dates";
import { petWeightMeasurements } from "./weight";
import type { DiaryEntry, HealthRecord, Pet } from "./schema";
import type { PetDocument } from "./document";

export type ClinicalWeightEntry = {
  date: string;
  weightKg: number;
};

export type ClinicalWeightSummary = {
  currentWeightKg: number | null;
  currentDate: string | null;
  previousWeightKg: number | null;
  deltaKg: number | null;
  targetWeightKg: number | null;
  history: ClinicalWeightEntry[];
};

export type ActiveMedicationSummary = {
  recordId: string;
  title: string;
  amount: string;
  unit: string;
  times: string[];
  everyDays: number;
  timeZone: string;
  startsOn: string;
  endsOn: string | null;
  instructions: string;
  source: string;
  latestDose?: {
    date: string;
    time: string;
    status: string;
    recordedAt: string;
  };
};

export type VaccineSummary = {
  recordId: string;
  title: string;
  date: string;
  nextDueDate: string | null;
  manufacturer: string | null;
  batchNumber: string | null;
  professional: string | null;
  notes: string | null;
  status: "em_dia" | "atencao" | "vencido";
};

export type ExamAttachmentSummary = {
  id: string;
  title: string;
  date: string | null;
  sourceType: "record" | "document";
  professionalOrLab: string | null;
  notes: string | null;
  fileName: string | null;
  fileData: string | null;
  mimeType?: string | null;
};

export type ClinicalDossier = {
  pet: Pet;
  generatedAt: string;
  weight: ClinicalWeightSummary;
  allergies: string[];
  chronicConditions: string[];
  clinicalNotes: string | null;
  activeMedications: ActiveMedicationSummary[];
  recentVaccines: VaccineSummary[];
  recentExams: ExamAttachmentSummary[];
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

export function buildClinicalDossier({
  pet,
  records,
  diary = [],
  documents = [],
  now = new Date(),
}: {
  pet: Pet;
  records: HealthRecord[];
  diary?: DiaryEntry[];
  documents?: PetDocument[];
  now?: Date;
}): ClinicalDossier {
  const today = todayKey(now);
  const petRecords = records.filter((record) => record.petId === pet.id);
  const petDiary = diary.filter((entry) => entry.petId === pet.id);
  const petDocs = documents.filter(
    (doc) => doc.petId === pet.id && !doc.deletedAt,
  );

  // 1. Weight summary & history
  const allMeasures = petWeightMeasurements(pet, petRecords, petDiary);
  const measures = allMeasures.filter(
    (m): m is typeof m & { weightKg: number } =>
      typeof m.weightKg === "number" && !Number.isNaN(m.weightKg),
  );
  const latest = measures.at(-1) ?? null;
  const previous = measures.length >= 2 ? measures.at(-2)! : null;
  const deltaKg =
    latest && previous
      ? Math.round((latest.weightKg - previous.weightKg) * 100) / 100
      : null;

  // Recent history in reverse chronological order (last 8 measurements)
  const weightHistory: ClinicalWeightEntry[] = measures
    .slice()
    .reverse()
    .slice(0, 8)
    .map((m) => ({ date: m.date, weightKg: m.weightKg }));

  const weightSummary: ClinicalWeightSummary = {
    currentWeightKg: latest?.weightKg ?? pet.weightKg ?? null,
    currentDate: latest?.date ?? null,
    previousWeightKg: previous?.weightKg ?? null,
    deltaKg,
    targetWeightKg: pet.targetWeightKg ?? null,
    history: weightHistory,
  };

  // 2. Allergies and chronic conditions
  const allergies = pet.allergies ?? [];
  const chronicConditions = pet.chronicConditions ?? [];

  // 3. Active medications
  const activeMedications: ActiveMedicationSummary[] = [];
  for (const record of petRecords) {
    if (record.type !== "medicamento") continue;
    if (record.completedAt !== null) continue;

    if (record.medication) {
      const activeSchedule = record.medication.schedules.find(
        (plan) =>
          plan.id === record.medication?.activeScheduleId &&
          plan.closedAt === null &&
          (!plan.endsOn || plan.endsOn >= today),
      );
      if (activeSchedule) {
        const lastEvent = record.medication.events
          .filter((event) => event.scheduleId === activeSchedule.id)
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];

        activeMedications.push({
          recordId: record.id,
          title: record.title,
          amount: activeSchedule.amount,
          unit: activeSchedule.unit,
          times: activeSchedule.times,
          everyDays: activeSchedule.everyDays,
          timeZone: activeSchedule.timeZone,
          startsOn: activeSchedule.startsOn,
          endsOn: activeSchedule.endsOn,
          instructions: activeSchedule.instructions,
          source: activeSchedule.source,
          latestDose: lastEvent
            ? {
                date: lastEvent.date,
                time: lastEvent.time,
                status: lastEvent.status,
                recordedAt: lastEvent.recordedAt,
              }
            : undefined,
        });
      }
    } else {
      // Legacy or simple medication without full course schema
      activeMedications.push({
        recordId: record.id,
        title: record.title,
        amount: "Conforme prescrição",
        unit: "",
        times: [],
        everyDays: 1,
        timeZone: "America/Sao_Paulo",
        startsOn: record.date,
        endsOn: record.nextDueDate,
        instructions: record.notes ?? "",
        source: record.professional ?? "Informado pelo tutor",
      });
    }
  }

  // 4. Vaccines
  const vaccineRecords = petRecords
    .filter((record) => record.type === "vacina")
    .sort((a, b) => b.date.localeCompare(a.date));

  // Extract manufacturer and batch from record fields or notes
  const recentVaccines: VaccineSummary[] = vaccineRecords.map((record) => {
    let manufacturer = record.manufacturer ?? null;
    let batchNumber = record.batchNumber ?? null;

    if (!manufacturer && record.notes) {
      const mMatch = /fabricante:?\s*([^;,\n]+)/i.exec(record.notes);
      if (mMatch) manufacturer = mMatch[1].trim();
    }
    if (!batchNumber && record.notes) {
      const bMatch = /lote:?\s*([^;,\n]+)/i.exec(record.notes);
      if (bMatch) batchNumber = bMatch[1].trim();
    }

    let status: VaccineSummary["status"] = "em_dia";
    if (record.nextDueDate) {
      if (record.nextDueDate < today) {
        status = "vencido";
      } else {
        const diffMs =
          Date.parse(`${record.nextDueDate}T12:00:00Z`) -
          Date.parse(`${today}T12:00:00Z`);
        const diffDays = Math.ceil(diffMs / 86400000);
        if (diffDays <= 30) {
          status = "atencao";
        }
      }
    }

    return {
      recordId: record.id,
      title: record.title,
      date: record.date,
      nextDueDate: record.nextDueDate,
      manufacturer,
      batchNumber,
      professional: record.professional,
      notes: record.notes,
      status,
    };
  });

  // 5. Recent exams & attachments
  const recentExams: ExamAttachmentSummary[] = [];

  // From health records (type === "exame" or any record with attachment)
  for (const record of petRecords) {
    if (record.type === "exame" || record.attachmentData) {
      recentExams.push({
        id: record.id,
        title: record.title,
        date: record.date,
        sourceType: "record",
        professionalOrLab: record.professional,
        notes: record.notes,
        fileName: record.attachmentName,
        fileData: record.attachmentData,
      });
    }
  }

  // From pet documents (category === "exame")
  for (const doc of petDocs) {
    if (doc.category === "exame") {
      recentExams.push({
        id: doc.id,
        title: doc.title,
        date: doc.date,
        sourceType: "document",
        professionalOrLab: null,
        notes: doc.notes,
        fileName: doc.fileName,
        fileData: null,
        mimeType: doc.mimeType,
      });
    }
  }

  recentExams.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return {
    pet,
    generatedAt: now.toISOString(),
    weight: weightSummary,
    allergies,
    chronicConditions,
    clinicalNotes: pet.notes,
    activeMedications,
    recentVaccines,
    recentExams,
  };
}

export function clinicalDossierHtml(dossier: ClinicalDossier): string {
  const { pet, weight, allergies, chronicConditions, activeMedications, recentVaccines, recentExams } =
    dossier;

  const weightDeltaText =
    weight.deltaKg !== null
      ? weight.deltaKg > 0
        ? `+${weight.deltaKg.toLocaleString("pt-BR")} kg em relação à pesagem anterior`
        : weight.deltaKg < 0
          ? `${weight.deltaKg.toLocaleString("pt-BR")} kg em relação à pesagem anterior`
          : "estável em relação à pesagem anterior"
      : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dossiê Clínico: ${escapeHtml(pet.name)} — Zelupi</title>
  <style>
    :root { --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      font-family: var(--font-sans);
      line-height: 1.45;
      color: #1a202c;
      background: #f7fafc;
      margin: 0;
      padding: 24px;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: #fff;
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid ${brandColors.brand};
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .header h1 { margin: 0 0 4px; font-size: 26px; color: ${brandColors.ink}; }
    .header .subtitle { font-size: 14px; color: #4a5568; margin: 0; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-danger { background: #fed7d7; color: #9b2c2c; }
    .badge-warning { background: #feebc8; color: #7c2d12; }
    .badge-success { background: #c6f6d5; color: #22543d; }
    .badge-info { background: #bee3f8; color: #2c5282; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    @media (max-width: 600px) { .grid-2 { grid-template-columns: 1fr; } }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      background: #fff;
    }
    .card-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0 0 10px;
      color: #2d3748;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .alert-box {
      background: #fff5f5;
      border-left: 4px solid #e53e3e;
      padding: 12px 14px;
      border-radius: 4px;
      margin-bottom: 12px;
    }
    .alert-title { font-weight: 700; color: #9b2c2c; font-size: 13px; text-transform: uppercase; margin-bottom: 4px; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag { background: #edf2f7; border-radius: 4px; padding: 3px 8px; font-size: 13px; font-weight: 500; }
    .tag-danger { background: #fed7d7; color: #9b2c2c; font-weight: 600; }
    .tag-warning { background: #feebc8; color: #9c4221; font-weight: 600; }

    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    th { text-align: left; padding: 6px 8px; background: #f7fafc; border-bottom: 2px solid #e2e8f0; color: #4a5568; font-weight: 600; }
    td { padding: 6px 8px; border-bottom: 1px solid #edf2f7; vertical-align: top; }

    .meta { font-size: 12px; color: #718096; }
    .print-bar { margin-bottom: 20px; display: flex; justify-content: flex-end; }
    .btn-print {
      background: ${brandColors["teal-ink"]};
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }

    @media print {
      body { background: #fff; padding: 0; }
      .container { max-width: none; box-shadow: none; padding: 0; }
      .print-bar { display: none; }
      @page { size: A4; margin: 12mm 15mm; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="print-bar">
      <button class="btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>
    </div>

    <header class="header">
      <div>
        <h1>${escapeHtml(pet.name)}</h1>
        <p class="subtitle">
          ${escapeHtml(pet.species === "cao" ? "Cão" : pet.species === "gato" ? "Gato" : "Outro animal")} ·
          ${escapeHtml(pet.breed ?? "Sem raça definida")} ·
          ${escapeHtml(pet.sex === "macho" ? "Macho" : pet.sex === "femea" ? "Fêmea" : "Sexo não informado")}
          ${pet.birthDate ? `· Nasc: ${formatShortDate(pet.birthDate)}` : ""}
          ${pet.microchip ? `· <strong>Microchip:</strong> ${escapeHtml(pet.microchip)}` : ""}
        </p>
      </div>
      <div style="text-align: right;">
        <span class="badge badge-info">Dossiê Clínico</span>
        <p class="meta" style="margin-top: 4px;">Gerado em ${formatDateTimeShort(dossier.generatedAt)}</p>
      </div>
    </header>

    ${
      allergies.length > 0 || chronicConditions.length > 0
        ? `
    <div class="alert-box">
      <div class="alert-title">Alergias e Condições Crônicas (Atenção Clínica)</div>
      ${
        allergies.length > 0
          ? `<p style="margin: 0 0 6px;"><strong>Alergias:</strong> <span class="tag-list" style="display:inline-flex;">${allergies
              .map((a) => `<span class="tag tag-danger">${escapeHtml(a)}</span>`)
              .join(" ")}</span></p>`
          : ""
      }
      ${
        chronicConditions.length > 0
          ? `<p style="margin: 0;"><strong>Condições Crônicas:</strong> <span class="tag-list" style="display:inline-flex;">${chronicConditions
              .map((c) => `<span class="tag tag-warning">${escapeHtml(c)}</span>`)
              .join(" ")}</span></p>`
          : ""
      }
    </div>`
        : ""
    }

    <div class="grid-2">
      <!-- Card Peso -->
      <div class="card">
        <div class="card-title">
          <span>Peso Atual e Histórico</span>
          <span style="font-size: 16px; color: ${brandColors["teal-ink"]}; font-weight: 700;">
            ${weight.currentWeightKg ? `${weight.currentWeightKg.toLocaleString("pt-BR")} kg` : "Não registrado"}
          </span>
        </div>
        ${
          weight.currentDate
            ? `<p class="meta" style="margin: 0 0 6px;">Última pesagem em ${formatShortDate(weight.currentDate)} ${weightDeltaText ? `(${weightDeltaText})` : ""}</p>`
            : ""
        }
        ${
          weight.targetWeightKg
            ? `<p class="meta" style="margin: 0 0 6px;">Peso ideal / meta: ${weight.targetWeightKg.toLocaleString("pt-BR")} kg</p>`
            : ""
        }
        ${
          weight.history.length > 1
            ? `
        <table>
          <thead>
            <tr><th>Data</th><th>Peso</th></tr>
          </thead>
          <tbody>
            ${weight.history
              .slice(0, 5)
              .map(
                (h) =>
                  `<tr><td>${formatShortDate(h.date)}</td><td><strong>${h.weightKg.toLocaleString("pt-BR")} kg</strong></td></tr>`,
              )
              .join("")}
          </tbody>
        </table>`
            : `<p class="meta">Apenas uma ou nenhuma pesagem registrada.</p>`
        }
      </div>

      <!-- Card Medicamentos -->
      <div class="card">
        <div class="card-title">
          <span>Medicamentos em Uso</span>
          <span class="badge ${activeMedications.length > 0 ? "badge-warning" : "badge-success"}">
            ${activeMedications.length} ativo(s)
          </span>
        </div>
        ${
          activeMedications.length > 0
            ? activeMedications
                .map(
                  (med) => `
            <div style="border-bottom: 1px solid #edf2f7; padding-bottom: 8px; margin-bottom: 8px;">
              <strong style="color: ${brandColors.ink};">${escapeHtml(med.title)}</strong><br>
              <span style="font-size: 13px;">${escapeHtml(med.amount)} ${escapeHtml(med.unit)} · Horários: ${escapeHtml(med.times.join(", ") || "Conforme prescrição")}</span><br>
              <span class="meta">Início: ${formatShortDate(med.startsOn)}${med.endsOn ? ` · Até: ${formatShortDate(med.endsOn)}` : " · Uso contínuo"} · Prescritor: ${escapeHtml(med.source)}</span>
              ${med.instructions ? `<div style="font-size: 12px; color: #4a5568; margin-top: 2px;"><em>${escapeHtml(med.instructions)}</em></div>` : ""}
            </div>`,
                )
                .join("")
            : `<p class="meta">Nenhum medicamento de uso contínuo ou recente ativo.</p>`
        }
      </div>
    </div>

    <!-- Vacinas Recentes -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-title">
        <span>Últimas Vacinas, Fabricante e Lote</span>
        <span class="meta">${recentVaccines.length} registro(s)</span>
      </div>
      ${
        recentVaccines.length > 0
          ? `
      <table>
        <thead>
          <tr>
            <th>Vacina</th>
            <th>Aplicação</th>
            <th>Próxima dose</th>
            <th>Fabricante / Lote</th>
            <th>Veterinário</th>
          </tr>
        </thead>
        <tbody>
          ${recentVaccines
            .slice(0, 6)
            .map(
              (vac) => `
            <tr>
              <td><strong>${escapeHtml(vac.title)}</strong></td>
              <td>${formatShortDate(vac.date)}</td>
              <td>
                ${
                  vac.nextDueDate
                    ? `<span class="badge ${vac.status === "vencido" ? "badge-danger" : vac.status === "atencao" ? "badge-warning" : "badge-success"}">${formatShortDate(vac.nextDueDate)}</span>`
                    : '<span class="meta">—</span>'
                }
              </td>
              <td>
                ${escapeHtml([vac.manufacturer, vac.batchNumber ? `Lote: ${vac.batchNumber}` : null].filter(Boolean).join(" · ") || "—")}
              </td>
              <td class="meta">${escapeHtml(vac.professional ?? "—")}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>`
          : `<p class="meta">Nenhuma vacina registrada.</p>`
      }
    </div>

    <!-- Exames Recentes e Anexos -->
    <div class="card">
      <div class="card-title">
        <span>Exames Recentes e Anexos</span>
        <span class="meta">${recentExams.length} exame(s)</span>
      </div>
      ${
        recentExams.length > 0
          ? `
      <table>
        <thead>
          <tr>
            <th>Exame</th>
            <th>Data</th>
            <th>Profissional / Lab</th>
            <th>Anexo disponível</th>
          </tr>
        </thead>
        <tbody>
          ${recentExams
            .slice(0, 8)
            .map(
              (exam) => `
            <tr>
              <td><strong>${escapeHtml(exam.title)}</strong>${exam.notes ? `<br><span class="meta">${escapeHtml(exam.notes)}</span>` : ""}</td>
              <td>${exam.date ? formatShortDate(exam.date) : "—"}</td>
              <td class="meta">${escapeHtml(exam.professionalOrLab ?? "—")}</td>
              <td>
                ${
                  exam.fileName || exam.fileData
                    ? `<span class="badge badge-info">📎 ${escapeHtml(exam.fileName ?? "Arquivo salvo")}</span>`
                    : '<span class="meta">Sem arquivo</span>'
                }
              </td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>`
          : `<p class="meta">Nenhum exame ou laudo anexado.</p>`
      }
    </div>

    ${
      pet.notes
        ? `
    <div class="card" style="margin-top: 20px;">
      <div class="card-title">Observações Gerais do Tutor</div>
      <p style="margin: 0; font-size: 13px; white-space: pre-wrap;">${escapeHtml(pet.notes)}</p>
    </div>`
        : ""
    }

    <footer style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #a0aec0; text-align: center;">
      Zelupi · Dossiê Clínico gerado para apoio em consulta veterinária. As informações foram informadas pelo tutor e não substituem exames presenciais nem atestados emitidos por médico veterinário com CRMV ativo.
    </footer>
  </div>
</body>
</html>`;
}
