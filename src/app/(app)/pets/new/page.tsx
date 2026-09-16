"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PetForm } from "@/components/pet-form";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/lib/store/app-store";

export default function NewPetPage() {
  const router = useRouter();
  const addPet = useAppStore((state) => state.addPet);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <PageHeader
        title="Novo pet"
        subtitle="Só o essencial agora. Você completa o resto depois."
        backHref="/pets"
      />

      <Card className="flex flex-col gap-5">
        <PetForm
          submitLabel="Salvar pet"
          onCancel={() => router.back()}
          onSubmit={(values) => {
            const petId = addPet(values);
            toast.success(`${values.name} agora faz parte do PetHub`);
            router.replace(`/pets`);
            useAppStore.getState().setActivePet(petId);
          }}
        />
      </Card>
    </div>
  );
}
