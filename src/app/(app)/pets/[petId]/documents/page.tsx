"use client";

import { useParams } from "next/navigation";
import { DocumentLibrary } from "@/components/document-library";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

export default function DocumentsPage() {
  const params = useParams<{ petId: string }>();
  const ready = useHydrated();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const documents = useAppStore((state) => state.documents);
  const records = useAppStore((state) => state.records);
  if (!ready) return <SkeletonScreen label="Abrindo documentos" />;
  if (!pet)
    return (
      <EmptyState
        title="Pet não encontrado"
        description="Esse perfil pode ter sido removido deste aparelho."
        action={<ButtonLink href="/pets">Voltar</ButtonLink>}
      />
    );
  return (
    <DocumentLibrary
      key={pet.id}
      pet={pet}
      documents={documents.filter((item) => item.petId === pet.id)}
      records={records.filter(
        (record) => record.petId === pet.id && record.attachmentData,
      )}
    />
  );
}
