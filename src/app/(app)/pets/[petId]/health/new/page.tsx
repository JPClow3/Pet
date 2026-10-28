"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { RecordForm } from "@/components/record-form";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { healthTypeMeta } from "@/lib/domain/labels";
import type { HealthRecordType } from "@/lib/domain/schema";
import { useAppStore } from "@/lib/store/app-store";

function NewRecordScreen() {
  const params = useParams<{ petId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const addRecord = useAppStore((state) => state.addRecord);

  const requestedType = searchParams.get("type");
  const initialType =
    requestedType && requestedType in healthTypeMeta
      ? (requestedType as HealthRecordType)
      : "vacina";

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
        title="Novo registro"
        subtitle={`O que aconteceu com ${pet.name}?`}
        backHref={`/pets/${pet.id}/health`}
      />

      <Card>
        <RecordForm
          key={`${pet.id}:${initialType}`}
          petId={pet.id}
          petName={pet.name}
          initialType={initialType}
          submitLabel="Salvar registro"
          onCancel={() => router.back()}
          onSubmit={async (values) => {
            const recordId = await addRecord({ ...values, petId: pet.id });
            toast.success("Registro salvo", {
              description:
                values.medication || values.nextDueDate !== null
                  ? "A próxima data está na agenda da Zelupi."
                  : "O histórico do seu pet foi atualizado.",
            });
            router.replace(
              values.medication
                ? `/pets/${pet.id}/health/${recordId}`
                : `/pets/${pet.id}/health`,
            );
          }}
        />
      </Card>
    </div>
  );
}

export default function NewRecordPage() {
  return (
    <Suspense fallback={<SkeletonScreen label="Preparando o formulário" />}>
      <NewRecordScreen />
    </Suspense>
  );
}
