"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  FileHeart,
  FileText,
  Pill,
  Printer,
  Scale,
  ShieldAlert,
  Stethoscope,
  Syringe,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { MicrochipGuideModal } from "@/components/microchip-guide-modal";
import {
  buildClinicalDossier,
  clinicalDossierHtml,
  type ClinicalDossier,
  type ExamAttachmentSummary,
} from "@/lib/domain/clinical-dossier";
import { formatShortDate } from "@/lib/domain/dates";
import { speciesLabels } from "@/lib/domain/labels";
import { downloadText } from "@/lib/download";
import type { DiaryEntry, HealthRecord, Pet } from "@/lib/domain/schema";
import type { PetDocument } from "@/lib/domain/document";

export function ClinicalDossierView({
  pet,
  records,
  diary = [],
  documents = [],
}: {
  pet: Pet;
  records: HealthRecord[];
  diary?: DiaryEntry[];
  documents?: PetDocument[];
}) {
  const [selectedExam, setSelectedExam] =
    useState<ExamAttachmentSummary | null>(null);
  const [microchipModalOpen, setMicrochipModalOpen] = useState(false);

  const dossier: ClinicalDossier = useMemo(
    () => buildClinicalDossier({ pet, records, diary, documents }),
    [pet, records, diary, documents],
  );

  const { weight, allergies, chronicConditions, activeMedications, recentVaccines, recentExams } =
    dossier;

  const handlePrint = () => {
    try {
      const html = clinicalDossierHtml(dossier);
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error(
          "O navegador bloqueou a abertura da janela. Permita pop-ups para imprimir.",
        );
      }
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success("Dossiê pronto para impressão", {
        description: "A janela de impressão foi aberta.",
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível imprimir o dossiê.",
      );
    }
  };

  const handleDownloadHtml = () => {
    try {
      const html = clinicalDossierHtml(dossier);
      downloadText(
        html,
        `dossie-clinico-${pet.name.toLowerCase().replace(/\s+/g, "-")}.html`,
        "text/html;charset=utf-8",
      );
      toast.success("Dossiê clínico baixado", {
        description: "Você pode abrir o arquivo em qualquer navegador ou enviar por e-mail.",
      });
    } catch {
      toast.error("Não foi possível baixar o dossiê.");
    }
  };

  const weightDeltaText =
    weight.deltaKg !== null
      ? weight.deltaKg > 0
        ? `+${weight.deltaKg.toLocaleString("pt-BR")} kg`
        : `${weight.deltaKg.toLocaleString("pt-BR")} kg`
      : null;

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* Top action header for Vet Clinic */}
      <div className="flex flex-col gap-3 rounded-[24px] border border-teal-ink/20 bg-mint/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-ink text-white shadow-sm">
            <Stethoscope aria-hidden="true" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink">
                Modo Consulta Veterinária
              </h1>
              <Chip tone="teal">Resumo em 1 tela</Chip>
            </div>
            <p className="text-meta text-muted">
              Visão focada para o atendimento de {pet.name} no consultório.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadHtml}
            className="gap-1.5"
          >
            <Download aria-hidden="true" className="size-4" />
            Baixar HTML
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5 font-bold">
            <Printer aria-hidden="true" className="size-4" />
            Imprimir Dossiê (A4)
          </Button>
        </div>
      </div>

      {/* Identificação Rápida */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-line bg-paper px-5 py-3 shadow-card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-ink">
          <span className="font-bold text-base text-ink">{pet.name}</span>
          <span>{speciesLabels[pet.species]}</span>
          {pet.breed ? <span>{pet.breed}</span> : null}
          {pet.birthDate ? (
            <span className="text-muted">Nasc: {formatShortDate(pet.birthDate)}</span>
          ) : null}
          {pet.color ? <span className="text-muted">Cor: {pet.color}</span> : null}
        </div>

        {pet.microchip ? (
          <div className="flex items-center gap-2">
            <span className="text-meta font-bold uppercase tracking-wider text-muted">
              Microchip:
            </span>
            <code className="rounded bg-surface px-2 py-0.5 font-mono text-xs font-bold text-teal-ink">
              {pet.microchip}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMicrochipModalOpen(true)}
              className="h-8 px-2 text-xs text-teal-ink"
            >
              Consultar bancos
            </Button>
          </div>
        ) : null}
      </div>

      {/* CARD 1: Alergias e Condições Crônicas (Alerta Clínico) */}
      {(allergies.length > 0 || chronicConditions.length > 0 || pet.notes) && (
        <Card className="border-danger/30 bg-danger/10 p-5">
          <div className="flex items-center gap-2 text-danger-ink">
            <ShieldAlert aria-hidden="true" className="size-5 shrink-0" />
            <CardTitle className="text-base text-danger-ink">
              Alergias e Condições Crônicas
            </CardTitle>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {allergies.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-meta font-bold uppercase tracking-wider text-danger-ink">
                  Alergias Conhecidas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allergies.map((allergy, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-danger/40 bg-white px-3 py-1 text-xs font-bold text-danger-ink shadow-sm"
                    >
                      ⚠️ {allergy}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {chronicConditions.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-meta font-bold uppercase tracking-wider text-warning-ink">
                  Condições Crônicas / Diagnósticos
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {chronicConditions.map((condition, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-bold text-amber-900 shadow-sm"
                    >
                      🩺 {condition}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {pet.notes ? (
            <div className="mt-3 border-t border-danger/20 pt-2 text-meta text-ink-soft">
              <strong className="text-ink">Observações do tutor:</strong>{" "}
              {pet.notes}
            </div>
          ) : null}
        </Card>
      )}

      {/* GRID: Peso e Medicamentos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* CARD 2: Peso Atual e Histórico Recente */}
        <Card className="flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale aria-hidden="true" className="size-5 text-teal-ink" />
                <CardTitle className="text-base">Peso Atual e Histórico</CardTitle>
              </div>
              <span className="text-xl font-black text-teal-ink">
                {weight.currentWeightKg
                  ? `${weight.currentWeightKg.toLocaleString("pt-BR")} kg`
                  : "Sem registro"}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-meta text-muted">
              {weight.currentDate && (
                <span>Última pesagem: {formatShortDate(weight.currentDate)}</span>
              )}
              {weightDeltaText && (
                <Chip
                  tone={
                    weight.deltaKg && weight.deltaKg > 0
                      ? "muted"
                      : weight.deltaKg && weight.deltaKg < 0
                        ? "danger"
                        : "teal"
                  }
                >
                  {weightDeltaText}
                </Chip>
              )}
              {weight.targetWeightKg && (
                <span className="text-ink font-semibold">
                  Meta: {weight.targetWeightKg.toLocaleString("pt-BR")} kg
                </span>
              )}
            </div>

            {weight.history.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="pb-1.5 font-bold uppercase tracking-wider">
                        Data
                      </th>
                      <th className="pb-1.5 font-bold uppercase tracking-wider">
                        Peso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {weight.history.slice(0, 6).map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface/50">
                        <td className="py-1.5 text-muted">
                          {formatShortDate(item.date)}
                        </td>
                        <td className="py-1.5 font-bold text-ink">
                          {item.weightKg.toLocaleString("pt-BR")} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-meta text-muted">
                Nenhum registro de peso no histórico.
              </p>
            )}
          </div>
        </Card>

        {/* CARD 3: Medicamentos em Uso com Dosagens */}
        <Card className="flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill aria-hidden="true" className="size-5 text-teal-ink" />
                <CardTitle className="text-base">Medicamentos em Uso</CardTitle>
              </div>
              <Chip tone={activeMedications.length > 0 ? "teal" : "muted"}>
                {activeMedications.length} em andamento
              </Chip>
            </div>

            {activeMedications.length > 0 ? (
              <div className="mt-3 flex flex-col divide-y divide-line/70">
                {activeMedications.map((med) => (
                  <div key={med.recordId} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-ink">
                        {med.title}
                      </span>
                      <span className="rounded bg-mint px-2 py-0.5 font-bold text-xs text-teal-ink">
                        {med.amount} {med.unit}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-meta text-muted">
                      {med.times.length > 0 && (
                        <span>Horários: {med.times.join(", ")}</span>
                      )}
                      <span>
                        Início: {formatShortDate(med.startsOn)}
                        {med.endsOn
                          ? ` até ${formatShortDate(med.endsOn)}`
                          : " · Contínuo"}
                      </span>
                      <span>Prescritor: {med.source}</span>
                    </div>

                    {med.instructions && (
                      <p className="mt-1 text-xs italic text-ink-soft">
                        “{med.instructions}”
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-meta text-muted">
                Nenhum medicamento ativo registrado.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* CARD 4: Últimas Vacinas com Data e Fabricante/Lote */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Syringe aria-hidden="true" className="size-5 text-teal-ink" />
            <CardTitle className="text-base">
              Últimas Vacinas (Fabricante e Lote)
            </CardTitle>
          </div>
          <span className="text-meta text-muted">
            {recentVaccines.length} registro(s)
          </span>
        </div>

        {recentVaccines.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="pb-2 font-bold uppercase tracking-wider">
                    Vacina
                  </th>
                  <th className="pb-2 font-bold uppercase tracking-wider">
                    Aplicação
                  </th>
                  <th className="pb-2 font-bold uppercase tracking-wider">
                    Próxima dose
                  </th>
                  <th className="pb-2 font-bold uppercase tracking-wider">
                    Fabricante e Lote
                  </th>
                  <th className="pb-2 font-bold uppercase tracking-wider">
                    Veterinário / Clínica
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {recentVaccines.map((vac) => (
                  <tr key={vac.recordId} className="hover:bg-surface/50">
                    <td className="py-2.5 font-bold text-ink">{vac.title}</td>
                    <td className="py-2.5 text-muted">
                      {formatShortDate(vac.date)}
                    </td>
                    <td className="py-2.5">
                      {vac.nextDueDate ? (
                        <Chip
                          tone={
                            vac.status === "vencido"
                              ? "danger"
                              : vac.status === "atencao"
                                ? "muted"
                                : "teal"
                          }
                        >
                          {formatShortDate(vac.nextDueDate)}
                        </Chip>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-ink-soft">
                      {[
                        vac.manufacturer,
                        vac.batchNumber ? `Lote: ${vac.batchNumber}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Não informado"}
                    </td>
                    <td className="py-2.5 text-muted">
                      {vac.professional || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-meta text-muted">
            Nenhuma vacina registrada no histórico.
          </p>
        )}
      </Card>

      {/* CARD 5: Exames Recentes e Acesso Rápido aos Anexos */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList aria-hidden="true" className="size-5 text-teal-ink" />
            <CardTitle className="text-base">
              Acesso Rápido aos Exames e Anexos
            </CardTitle>
          </div>
          <span className="text-meta text-muted">
            {recentExams.length} exame(s)
          </span>
        </div>

        {recentExams.length > 0 ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentExams.map((exam) => {
              const hasAttachment = Boolean(exam.fileName || exam.fileData);

              return (
                <div
                  key={exam.id}
                  className="flex flex-col justify-between rounded-xl border border-line bg-surface/40 p-3 hover:border-teal-ink/50 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-ink line-clamp-1">
                        {exam.title}
                      </span>
                      {hasAttachment ? (
                        <span className="shrink-0 text-teal-ink">📎</span>
                      ) : null}
                    </div>

                    <p className="mt-0.5 text-meta text-muted">
                      {exam.date ? formatShortDate(exam.date) : "Sem data"}
                      {exam.professionalOrLab ? ` · ${exam.professionalOrLab}` : ""}
                    </p>

                    {exam.notes && (
                      <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                        {exam.notes}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-line/50 pt-2">
                    {hasAttachment ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedExam(exam)}
                        className="h-8 gap-1.5 text-xs text-teal-ink font-semibold"
                      >
                        Visualizar anexo
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted">Sem anexo anexado</span>
                    )}

                    {exam.sourceType === "record" ? (
                      <ButtonLink
                        href={`/pets/${pet.id}/health/${exam.id}`}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                      >
                        Ver registro
                      </ButtonLink>
                    ) : (
                      <ButtonLink
                        href={`/pets/${pet.id}/documents`}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                      >
                        Ver em Documentos
                      </ButtonLink>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-meta text-muted">
            Nenhum exame ou resultado anexado neste perfil.
          </p>
        )}
      </Card>

      {/* Modal de Pré-visualização de Anexo de Exame */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-paper p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-bold text-lg text-ink">
                  {selectedExam.title}
                </h3>
                <p className="text-meta text-muted">
                  {selectedExam.fileName ?? "Anexo do exame"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="rounded-full p-1 text-muted hover:bg-surface"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div className="my-4 flex flex-1 items-center justify-center overflow-auto rounded-xl bg-surface p-2">
              {selectedExam.fileData &&
              selectedExam.fileData.startsWith("data:image/") ? (
                <img
                  src={selectedExam.fileData}
                  alt={selectedExam.title}
                  className="max-h-[60vh] max-w-full rounded object-contain"
                />
              ) : selectedExam.fileData ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <FileText className="size-16 text-teal-ink" />
                  <p className="text-sm font-semibold text-ink">
                    Documento salvo: {selectedExam.fileName}
                  </p>
                  <a
                    href={selectedExam.fileData}
                    download={selectedExam.fileName ?? "exame.pdf"}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-ink px-4 py-2 font-semibold text-white"
                  >
                    <Download className="size-4" /> Baixar arquivo do exame
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-muted">
                  <FileText className="size-12" />
                  <p className="text-sm">
                    Arquivo disponível na biblioteca de Documentos deste pet.
                  </p>
                  <ButtonLink href={`/pets/${pet.id}/documents`}>
                    Abrir Documentos
                  </ButtonLink>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setSelectedExam(null)}>
                Fechar visualização
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Microchip Guide Modal */}
      <MicrochipGuideModal
        microchip={pet.microchip}
        petName={pet.name}
        open={microchipModalOpen}
        onClose={() => setMicrochipModalOpen(false)}
      />
    </div>
  );
}
