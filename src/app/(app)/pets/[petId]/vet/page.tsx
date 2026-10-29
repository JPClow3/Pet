"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { ClinicalDossierView } from "@/components/clinical-dossier-view";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

export default function PetVetDossierPage() {
  const params = useParams<{ petId: string }>();
  const ready = useHydrated();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const records = useAppStore((state) => state.records);
  const diary = useAppStore((state) => state.diary);
  const documents = useAppStore((state) => state.documents);

  const petRecords = useMemo(
    () => records.filter((record) => record.petId === params.petId),
    [records, params.petId],
  );

  const petDiary = useMemo(
    () => diary.filter((entry) => entry.petId === params.petId),
    [diary, params.petId],
  );

  const petDocs = useMemo(
    () => documents.filter((doc) => doc.petId === params.petId),
    [documents, params.petId],
  );

  if (!ready) {
    return <SkeletonScreen label="Preparando o dossiê clínico" />;
  }

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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-12">
      <PageHeader
        title="Modo Consulta"
        subtitle={`Dossiê clínico focado para a consulta de ${pet.name}`}
        backHref={`/pets/${pet.id}/health`}
      />

      <ClinicalDossierView
        pet={pet}
        records={petRecords}
        diary={petDiary}
        documents={petDocs}
      />
    </div>
  );
}
