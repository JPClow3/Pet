"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { PetForm } from "@/components/pet-form";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { CheckboxRow, Field, Input } from "@/components/ui/field";
import type { Pet } from "@/lib/domain/schema";
import { useAppStore } from "@/lib/store/app-store";
import { useAsyncAction } from "@/lib/use-async-action";

export default function EditPetPage() {
  const params = useParams<{ petId: string }>();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  if (!pet)
    return (
      <EmptyState
        title="Pet não encontrado"
        description="Esse perfil pode ter sido removido deste aparelho."
        action={<ButtonLink href="/pets">Voltar para Meu Pet</ButtonLink>}
      />
    );
  return <EditPetContent key={pet.id} pet={pet} />;
}

function EditPetContent({ pet }: { pet: Pet }) {
  const router = useRouter();
  const updatePet = useAppStore((state) => state.updatePet);
  const [initialPet] = useState(pet);
  const [card, setCard] = useState(pet.card);
  const action = useAsyncAction();
  return (
    <div className="flex flex-col gap-4 pb-6">
      <PageHeader
        title={`Editar ${pet.name}`}
        subtitle="Quanto mais completo, melhor a carteirinha funciona em uma emergência."
        backHref="/pets"
      />
      <Card className="flex flex-col gap-5">
        <PetForm
          initial={initialPet}
          submitLabel="Salvar alterações"
          onCancel={() => router.back()}
          onSubmit={async (values) => {
            await updatePet(pet.id, values);
            toast.success("Perfil atualizado");
            router.replace("/pets");
          }}
        />
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-[1rem] font-semibold text-ink">
          Carteirinha pública
        </h2>
        <p className="text-meta text-muted">
          Escolha o que aparece na próxima carteirinha de {pet.name}.
        </p>
        <fieldset
          disabled={action.pending}
          className="flex min-w-0 flex-col gap-3"
        >
          <CheckboxRow
            label="Mostrar raça"
            checked={card.shareBreed}
            onChange={(checked) =>
              setCard((current) => ({ ...current, shareBreed: checked }))
            }
          />
          <CheckboxRow
            label="Mostrar cidade aproximada"
            checked={card.shareCity}
            onChange={(checked) =>
              setCard((current) => ({ ...current, shareCity: checked }))
            }
          />
          <CheckboxRow
            label="Mostrar status de saúde (sem detalhes clínicos)"
            checked={card.shareHealth}
            onChange={(checked) =>
              setCard((current) => ({ ...current, shareHealth: checked }))
            }
          />
          <Field
            label="Contato preferido na carteirinha"
            htmlFor="pet-card-contact"
            hint="Prefira um número que você atende. Evite dados sensíveis."
          >
            <Input
              id="pet-card-contact"
              value={card.contact ?? ""}
              onChange={(event) =>
                setCard((current) => ({
                  ...current,
                  contact: event.target.value || null,
                }))
              }
              placeholder="(11) 90000-0000"
              maxLength={120}
            />
          </Field>
          <Button
            variant="secondary"
            onClick={() =>
              void action.run(async () => {
                await updatePet(pet.id, { card });
                toast.success("Preferências da carteirinha salvas");
              })
            }
          >
            {action.pending
              ? "Salvando…"
              : "Salvar preferências da carteirinha"}
          </Button>
        </fieldset>
        <p className="text-meta text-muted">
          Links já compartilhados mantêm a cópia anterior. Abra a carteirinha
          para revisar e atualizar o que está público.
        </p>
        <ButtonLink href={`/pets/${pet.id}/card`} variant="ghost" size="sm">
          Revisar carteirinha
        </ButtonLink>
      </Card>
      <Card className="flex flex-col gap-2">
        <h2 className="text-[1rem] font-semibold text-ink">Remover pet</h2>
        <p className="text-meta text-muted">
          Isso apaga registros, documentos, lembretes e diário de {pet.name}{" "}
          neste aparelho. Faça um backup antes.
        </p>
        <Button
          variant="danger"
          disabled={action.pending}
          onClick={() => {
            if (!window.confirm(`Remover ${pet.name} e todo o histórico?`))
              return;
            void action.run(async () => {
              await useAppStore.getState().removePet(pet.id);
              toast.success(`${pet.name} foi removido`);
              router.replace("/pets");
            });
          }}
        >
          Remover {pet.name}
        </Button>
      </Card>
    </div>
  );
}
