"use client";

import { Download, FileText, Plus, RotateCcw, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { SelectedDocumentFile } from "@/components/document-editor";

const DocumentEditor = dynamic(
  () =>
    import("@/components/document-editor").then((mod) => mod.DocumentEditor),
  {
    loading: () => (
      <div role="status" className="py-6 text-center text-meta text-muted">
        Carregando editor de documento…
      </div>
    ),
  },
);
import { PageHeader } from "@/components/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { formatShortDate } from "@/lib/domain/dates";
import {
  DOCUMENT_CATEGORIES,
  documentCategoryLabels,
  formatDocumentSize,
  type DocumentCategory,
  type DocumentPatch,
  type PetDocument,
} from "@/lib/domain/document";
import type { HealthRecord, Pet } from "@/lib/domain/schema";
import {
  downloadDocumentFile,
  safeDocumentFileName,
} from "@/lib/document-file";
import { healthTypeMeta } from "@/lib/domain/labels";
import { useAppStore } from "@/lib/store/app-store";
import { readMedia } from "@/lib/store/media";

export function DocumentLibrary({
  pet,
  documents,
  records,
}: {
  pet: Pet;
  documents: PetDocument[];
  records: HealthRecord[];
}) {
  const [editing, setEditing] = useState<PetDocument | "new" | null>(null);
  const [trash, setTrash] = useState(false);
  const [category, setCategory] = useState<DocumentCategory | "todos">("todos");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const pending = useRef(false);
  const activeCount = documents.filter((item) => !item.deletedAt).length;
  const trashedCount = documents.length - activeCount;
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("pt-BR");
    return documents
      .filter(
        (item) =>
          Boolean(item.deletedAt) === trash &&
          (category === "todos" || item.category === category) &&
          (!search ||
            `${item.title} ${item.fileName}`
              .toLocaleLowerCase("pt-BR")
              .includes(search)),
      )
      .sort((a, b) =>
        (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt),
      );
  }, [documents, trash, category, query]);

  const runAction = async (item: PetDocument, action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusyId(item.id);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível concluir. Seus documentos foram mantidos; tente novamente.",
      );
    } finally {
      pending.current = false;
      setBusyId(null);
    }
  };

  const save = async (
    metadata: DocumentPatch,
    file: SelectedDocumentFile | null,
  ) => {
    setError("");
    const store = useAppStore.getState();
    if (editing && editing !== "new") {
      await store.updateDocument(editing.id, metadata);
      toast.success("Documento atualizado");
    } else {
      if (!file) throw new Error("Escolha um arquivo para guardar.");
      await store.createDocument(
        { ...metadata, petId: pet.id, fileName: file.fileName },
        file.blob,
      );
      setTrash(false);
      setCategory("todos");
      setQuery("");
      toast.success("Documento guardado neste aparelho");
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader
        title="Documentos"
        subtitle={`Arquivos de ${pet.name}, organizados e privados.`}
        backHref="/pets"
        action={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" className="size-4" />
            Adicionar
          </Button>
        }
      />
      <p className="text-sm leading-relaxed text-muted">
        Guarde PDFs, exames, receitas e fotos sem criar um cuidado. Os arquivos
        originais ficam neste aparelho e entram no backup.
      </p>
      <div className="flex flex-wrap gap-2">
        <FilterChip selected={!trash} onClick={() => setTrash(false)}>
          Documentos ({activeCount})
        </FilterChip>
        <FilterChip selected={trash} onClick={() => setTrash(true)}>
          Lixeira ({trashedCount})
        </FilterChip>
      </div>
      {documents.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Buscar documento" htmlFor="document-search">
            <Input
              id="document-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome ou arquivo"
            />
          </Field>
          <Field label="Filtrar categoria" htmlFor="document-filter">
            <Select
              id="document-filter"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as DocumentCategory | "todos")
              }
            >
              <option value="todos">Todas as categorias</option>
              {DOCUMENT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {documentCategoryLabels[value]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-2xl bg-danger-soft p-3 text-sm text-danger-ink"
        >
          {error}
        </p>
      ) : null}
      {trash ? (
        <p className="text-sm text-muted">
          Os documentos da lixeira continuam guardados e podem ser restaurados.
          Eles também são incluídos no backup.
        </p>
      ) : null}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText aria-hidden="true" className="size-5" />}
          title={
            trash
              ? "Nenhum documento nesta lixeira"
              : activeCount === 0
                ? "Exames e carteirinhas fáceis de encontrar"
                : "Nada nesta seleção"
          }
          description={
            trash
              ? "Arquivos movidos para a lixeira aparecerão aqui para recuperação."
              : activeCount === 0
                ? "Adicione um PDF ou imagem. Depois você pode baixar o original, editar os detalhes e organizar por categoria."
                : "Tente outro nome ou categoria."
          }
          action={
            !trash && activeCount === 0 ? (
              <Button size="sm" onClick={() => setEditing("new")}>
                Adicionar documento
              </Button>
            ) : query || category !== "todos" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setCategory("todos");
                }}
              >
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul
          className="flex flex-col gap-3"
          aria-label={trash ? "Documentos na lixeira" : "Documentos guardados"}
        >
          {filtered.map((item) => (
            <li key={item.id}>
              <Card
                className="flex flex-col gap-3"
                aria-busy={busyId === item.id}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-teal-ink">
                    <FileText aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-semibold text-ink">
                      {item.title}
                    </h2>
                    <p className="text-meta text-muted">
                      {documentCategoryLabels[item.category]}
                      {item.date
                        ? ` · ${formatShortDate(item.date)}`
                        : " · Sem data"}
                    </p>
                  </div>
                </div>
                <p className="break-all text-meta text-ink-soft">
                  {item.fileName}
                  <span className="block text-muted">
                    {item.mimeType === "application/pdf" ? "PDF" : "Imagem"} ·{" "}
                    {formatDocumentSize(item.sizeBytes)}
                  </span>
                </p>
                {item.notes ? (
                  <p className="whitespace-pre-wrap break-words text-sm text-ink-soft">
                    {item.notes}
                  </p>
                ) : null}
                {item.deletedAt ? (
                  <p className="text-meta text-muted">
                    Na lixeira desde{" "}
                    {formatShortDate(item.deletedAt.slice(0, 10))}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId !== null}
                    aria-label={`Baixar ${item.title}`}
                    onClick={() =>
                      void runAction(item, async () => {
                        await downloadDocumentFile(
                          await readMedia(item.mediaId),
                          item,
                        );
                      })
                    }
                  >
                    <Download aria-hidden="true" className="size-4" />
                    {busyId === item.id ? "Aguarde…" : "Baixar"}
                  </Button>
                  {trash ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId !== null}
                      aria-label={`Restaurar ${item.title}`}
                      onClick={() =>
                        void runAction(item, async () => {
                          await useAppStore.getState().restoreDocument(item.id);
                          toast.success("Documento restaurado");
                        })
                      }
                    >
                      <RotateCcw aria-hidden="true" className="size-4" />
                      Restaurar
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId !== null}
                        aria-label={`Editar ${item.title}`}
                        onClick={() => setEditing(item)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId !== null}
                        aria-label={`Mover ${item.title} para a lixeira`}
                        onClick={() =>
                          void runAction(item, async () => {
                            await useAppStore.getState().trashDocument(item.id);
                            toast.success("Documento movido para a lixeira", {
                              description:
                                "Você pode restaurá-lo na aba Lixeira.",
                            });
                          })
                        }
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        Lixeira
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {!trash && records.length > 0 ? (
        <section
          className="flex flex-col gap-3"
          aria-labelledby="record-attachments-title"
        >
          <h2 id="record-attachments-title" className="font-semibold text-ink">
            Anexos do histórico
          </h2>
          <p className="text-sm text-muted">
            Estas imagens continuam ligadas aos cuidados. Para alterá-las, abra
            o registro correspondente.
          </p>
          <ul className="flex flex-col gap-3">
            {[...records]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((record) => {
                const match = record.attachmentData?.match(
                  /^data:(image\/(?:jpeg|png|webp|gif));base64,[A-Za-z0-9+/=\s]+$/,
                );
                return (
                  <li key={record.id}>
                    <Card className="flex flex-col gap-2">
                      <h3 className="break-words font-medium text-ink">
                        {record.title}
                      </h3>
                      <p className="text-meta text-muted">
                        {healthTypeMeta[record.type].label} ·{" "}
                        {formatShortDate(record.date)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {match ? (
                          <a
                            href={record.attachmentData!}
                            download={safeDocumentFileName(
                              record.attachmentName ?? "anexo",
                              match[1] as
                                | "image/jpeg"
                                | "image/png"
                                | "image/webp"
                                | "image/gif",
                            )}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-teal-ink"
                          >
                            <Download aria-hidden="true" className="size-4" />
                            Baixar imagem
                          </a>
                        ) : null}
                        <ButtonLink
                          href={`/pets/${pet.id}/health/${record.id}`}
                          size="sm"
                          variant="secondary"
                        >
                          Abrir registro
                        </ButtonLink>
                      </div>
                    </Card>
                  </li>
                );
              })}
          </ul>
        </section>
      ) : null}
      <Card className="text-meta text-muted">
        Guarde uma cópia fora deste navegador antes de limpar os dados do
        aparelho.{" "}
        <ButtonLink href="/profile" variant="ghost" size="sm" className="mt-2">
          Abrir ajustes e backup
        </ButtonLink>
      </Card>
      {editing ? (
        <DocumentEditor
          key={editing === "new" ? "new" : editing.id}
          petName={pet.name}
          initial={editing === "new" ? undefined : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
