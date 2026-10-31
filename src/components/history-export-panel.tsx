"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckboxRow, Field, Input } from "@/components/ui/field";
import { BottomSheet } from "@/components/ui/sheet";
import { downloadText } from "@/lib/download";
import { HEALTH_TYPES, healthTypeMeta } from "@/lib/domain/labels";
import {
  healthExportFiltersSchema,
  healthReportHtml,
  selectHealthExportRecords,
} from "@/lib/domain/health-export";
import type { HealthRecord, HealthRecordType, Pet } from "@/lib/domain/schema";

export function HistoryExportPanel({
  pet,
  records,
}: {
  pet: Pet;
  records: HealthRecord[];
}) {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [types, setTypes] = useState<HealthRecordType[]>([...HEALTH_TYPES]);
  const [error, setError] = useState("");
  const selection = healthExportFiltersSchema.safeParse({
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    types,
  });
  const count = selection.success
    ? selectHealthExportRecords(pet.id, records, selection.data).length
    : 0;
  const validation = selection.success ? "" : selection.error.issues[0].message;

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Download aria-hidden="true" className="size-4" />
        Exportar histórico
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Exportar histórico"
        description={`Prepare um resumo de ${pet.name}, com as datas e observações escolhidas.`}
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Data inicial"
              htmlFor="history-from"
              hint="Deixe em branco para incluir desde o início"
            >
              <Input
                id="history-from"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </Field>
            <Field
              label="Data final"
              htmlFor="history-to"
              hint="Inclui os cuidados desta data"
            >
              <Input
                id="history-to"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </Field>
          </div>
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-semibold text-ink">
              Tipos de cuidado
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {HEALTH_TYPES.map((type) => (
                <CheckboxRow
                  key={type}
                  id={`history-type-${type}`}
                  label={healthTypeMeta[type].label}
                  checked={types.includes(type)}
                  onChange={(checked) =>
                    setTypes((current) =>
                      checked
                        ? [...current, type]
                        : current.filter((value) => value !== type),
                    )
                  }
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTypes([...HEALTH_TYPES])}
            >
              Selecionar todos
            </Button>
          </fieldset>
          {validation || error ? (
            <p role="alert" className="text-sm text-danger-ink">
              {validation || error}
            </p>
          ) : null}
          <p role="status" className="text-sm font-medium text-ink">
            {count} registro{count === 1 ? " selecionado" : "s selecionados"}
          </p>
          {selection.success && count === 0 ? (
            <p className="text-sm text-muted">
              Nenhum cuidado corresponde à seleção. Ajuste o período ou os tipos
              para preparar o resumo.
            </p>
          ) : null}
          <p className="text-meta text-muted">
            O arquivo contém somente os registros deste pet. Fotos e documentos
            não são incluídos; baixe os anexos separadamente em Documentos.
          </p>
          <p className="text-meta text-muted">
            O período considera a data do registro. Medicamentos selecionados
            incluem todo o histórico de planos, doses e correções.
          </p>
          <Button
            disabled={!selection.success || count === 0}
            onClick={() => {
              if (!selection.success || count === 0) return;
              try {
                downloadText(
                  healthReportHtml(pet, records, new Date(), selection.data),
                  `zelupi-historico-${pet.id}.html`,
                  "text/html;charset=utf-8",
                );
                setError("");
                toast.success("Resumo preparado", {
                  description:
                    "Abra o arquivo e use Imprimir para imprimir ou salvar como PDF.",
                });
              } catch {
                setError(
                  "Não foi possível baixar o histórico. Sua seleção foi mantida; tente novamente.",
                );
              }
            }}
          >
            <Download aria-hidden="true" className="size-4" />
            Baixar resumo para imprimir
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Voltar ao histórico
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
