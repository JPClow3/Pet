"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { BottomSheet } from "@/components/ui/sheet";
import { todayKey } from "@/lib/domain/dates";
import {
  DOCUMENT_CATEGORIES,
  documentCategoryLabels,
  documentMetadataSchema,
  formatDocumentSize,
  type DocumentCategory,
  type DocumentPatch,
  type PetDocument,
} from "@/lib/domain/document";
import { validateDocumentFile } from "@/lib/document-file";

export type SelectedDocumentFile = { blob: Blob; fileName: string };

export function DocumentEditor({
  petName,
  initial,
  onClose,
  onSave,
}: {
  petName: string;
  initial?: PetDocument;
  onClose: () => void;
  onSave: (
    metadata: DocumentPatch,
    file: SelectedDocumentFile | null,
  ) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<DocumentCategory>(
    initial?.category ?? "exame",
  );
  const [date, setDate] = useState(initial ? (initial.date ?? "") : todayKey());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);

  return (
    <BottomSheet
      open
      onClose={() => {
        if (!pending.current) onClose();
      }}
      title={initial ? "Editar documento" : "Adicionar documento"}
      description={`Guarde um arquivo de ${petName} sem precisar criar um registro de saúde.`}
    >
      <form
        className="flex flex-col gap-4"
        aria-busy={saving}
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending.current) return;
          const metadata = documentMetadataSchema.safeParse({
            title,
            category,
            date: date || null,
            notes: notes.trim() || null,
          });
          if (!metadata.success) {
            setError(metadata.error.issues[0].message);
            return;
          }
          if (!initial && !file) {
            setError("Escolha o arquivo que deseja guardar.");
            return;
          }
          pending.current = true;
          setSaving(true);
          setError("");
          try {
            let selected: SelectedDocumentFile | null = null;
            if (file && !initial) {
              const info = await validateDocumentFile(file, file.name);
              selected = {
                blob: new Blob([file], { type: info.mimeType }),
                fileName: info.fileName,
              };
            }
            await onSave(metadata.data, selected);
            onClose();
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Não foi possível salvar. O formulário foi mantido para você tentar novamente.",
            );
          } finally {
            pending.current = false;
            setSaving(false);
          }
        }}
      >
        {error ? (
          <p
            role="alert"
            className="rounded-card bg-danger-soft p-3 text-sm text-danger-ink"
          >
            {error}
          </p>
        ) : null}
        {!initial ? (
          <Field
            label="Arquivo"
            htmlFor="document-file"
            hint="PDF, JPG, PNG, WebP ou GIF, até 10 MB. O original é preservado."
          >
            <Input
              id="document-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
              disabled={saving}
              className="py-3 text-sm file:mr-3 file:border-0 file:bg-transparent file:font-semibold file:text-teal-ink"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                setError("");
                if (selected && !title.trim())
                  setTitle(selected.name.replace(/\.[^.]+$/, "").slice(0, 100));
              }}
            />
          </Field>
        ) : (
          <p className="flex items-start gap-2 rounded-card bg-surface p-3 text-sm text-ink-soft">
            <FileText aria-hidden="true" className="size-5 shrink-0" />
            <span className="min-w-0 break-all">
              {initial.fileName}
              <span className="block text-meta text-muted">
                {formatDocumentSize(initial.sizeBytes)} · O arquivo original
                permanece igual.
              </span>
            </span>
          </p>
        )}
        {file ? (
          <p className="text-meta text-muted">
            Selecionado: {file.name} · {formatDocumentSize(file.size)}
          </p>
        ) : null}
        <Field label="Nome do documento" htmlFor="document-title">
          <Input
            id="document-title"
            value={title}
            maxLength={100}
            disabled={saving}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Exame de sangue de outubro"
          />
        </Field>
        <Field label="Categoria" htmlFor="document-category">
          <Select
            id="document-category"
            value={category}
            disabled={saving}
            onChange={(event) =>
              setCategory(event.target.value as DocumentCategory)
            }
          >
            {DOCUMENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {documentCategoryLabels[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Data do documento"
          htmlFor="document-date"
          hint="Opcional; use a data que aparece no arquivo"
        >
          <Input
            id="document-date"
            type="date"
            value={date}
            disabled={saving}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field
          label="Observações"
          htmlFor="document-notes"
          hint="Opcional, até 600 caracteres"
        >
          <Textarea
            id="document-notes"
            value={notes}
            maxLength={600}
            disabled={saving}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
        <p className="text-meta text-muted">
          Este arquivo fica privado neste aparelho. Inclua-o em uma cópia de
          segurança para recuperá-lo em outro navegador.
        </p>
        <Button type="submit" disabled={saving}>
          <Upload aria-hidden="true" className="size-4" />
          {saving
            ? "Guardando no aparelho…"
            : initial
              ? "Salvar alterações"
              : "Guardar documento"}
        </Button>
        <Button variant="ghost" disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
      </form>
    </BottomSheet>
  );
}
