"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { RecordForm } from "@/components/record-form";
import { Photo } from "@/components/ui/photo";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTimeShort } from "@/lib/domain/dates";
import { useAppStore } from "@/lib/store/app-store";

export default function RecordDetailPage() {
  const params = useParams<{ petId: string; recordId: string }>();
  const router = useRouter();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const record = useAppStore((state) =>
    state.records.find((item) => item.id === params.recordId),
  );
  const updateRecord = useAppStore((state) => state.updateRecord);
  const removeRecord = useAppStore((state) => state.removeRecord);

  if (!pet || !record) {
    return (
      <EmptyState
        title="Registro não encontrado"
        description="Ele pode ter sido removido deste aparelho."
        action={<ButtonLink href="/pets">Voltar</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <PageHeader
        title={record.title}
        subtitle={`Registrado em ${formatDateTimeShort(record.createdAt)}`}
        backHref={`/pets/${pet.id}/health`}
      />

      {record.completedAt ? (
        <Card className="border-teal/25 bg-mint/60">
          <p className="text-[0.9rem] text-teal-ink">
            Ciclo concluído. O próximo cuidado virou um novo registro na linha
            do tempo.
          </p>
        </Card>
      ) : null}

      {record.attachmentData ? (
        <Card className="flex flex-col gap-2">
          <h2 className="text-[1rem] font-semibold text-ink">Anexo</h2>
          <Photo
            src={record.attachmentData}
            alt={record.attachmentName ?? "Anexo do registro"}
            className="w-full rounded-2xl"
          />
        </Card>
      ) : null}

      <Card>
        <RecordForm
          petName={pet.name}
          initial={record}
          submitLabel="Salvar alterações"
          onCancel={() => router.back()}
          onSubmit={(values) => {
            updateRecord(record.id, { ...values, petId: pet.id });
            toast.success("Registro atualizado");
            router.replace(`/pets/${pet.id}/health`);
          }}
          onDelete={() => {
            if (!window.confirm(`Excluir "${record.title}" do histórico?`))
              return;
            removeRecord(record.id);
            toast.success("Registro excluído");
            router.replace(`/pets/${pet.id}/health`);
          }}
        />
      </Card>
    </div>
  );
}
