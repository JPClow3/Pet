"use client";

import { FileText } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import { PageHeader } from "@/components/page-header";
import { Photo } from "@/components/ui/photo";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatShortDate } from "@/lib/domain/dates";
import { healthTypeMeta } from "@/lib/domain/labels";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

export default function DocumentsPage() {
  const params = useParams<{ petId: string }>();
  const ready = useHydrated();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const records = useAppStore((state) => state.records);

  const documents = useMemo(
    () =>
      records
        .filter(
          (record) => record.petId === params.petId && record.attachmentData,
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records, params.petId],
  );

  if (!pet) {
    return (
      <EmptyState
        title="Pet não encontrado"
        description="Esse perfil pode ter sido removido deste aparelho."
        action={<ButtonLink href="/pets">Voltar</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <PageHeader
        title="Documentos"
        subtitle={`Exames, receitas e carteirinha de ${pet.name}`}
        backHref="/pets"
      />

      {!ready ? null : documents.length === 0 ? (
        <EmptyState
          icon={<FileText aria-hidden="true" className="size-5" />}
          title="Nenhum documento anexado"
          description="Ao registrar um cuidado, anexe a foto do exame, receita ou carteirinha. Tudo fica neste aparelho."
          action={
            <ButtonLink href={`/pets/${pet.id}/health/new`} size="sm">
              Adicionar com anexo
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {documents.map((record) => (
            <li key={record.id} className="flex flex-col gap-1">
              <Photo
                src={record.attachmentData}
                alt={record.attachmentName ?? record.title}
                className="h-36 w-full rounded-2xl border border-line"
              />
              <p className="text-[0.9rem] font-medium text-ink">
                {record.title}
              </p>
              <p className="text-meta text-muted">
                {healthTypeMeta[record.type].label} ·{" "}
                {formatShortDate(record.date)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Card className="text-meta text-muted">
        Os arquivos ficam salvos apenas neste aparelho. Ao excluir a conta, eles
        também são apagados.
      </Card>
    </div>
  );
}
