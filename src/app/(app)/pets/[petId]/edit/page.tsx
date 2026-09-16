"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { PetForm } from "@/components/pet-form";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";

export default function EditPetPage() {
  const params = useParams<{ petId: string }>();
  const router = useRouter();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const updatePet = useAppStore((state) => state.updatePet);

  if (!pet) {
    return (
      <EmptyState
        title="Pet não encontrado"
        description="Esse perfil pode ter sido removido deste aparelho."
        action={<ButtonLink href="/pets">Voltar para Meu Pet</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <PageHeader
        title={`Editar ${pet.name}`}
        subtitle="Quanto mais completo, melhor a carteirinha funciona em uma emergência."
        backHref={`/pets`}
      />

      <Card className="flex flex-col gap-5">
        <PetForm
          initial={pet}
          submitLabel="Salvar alterações"
          onCancel={() => router.back()}
          onSubmit={(values) => {
            updatePet(pet.id, values);
            toast.success("Perfil atualizado");
            router.replace(`/pets`);
          }}
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-[1rem] font-semibold text-ink">
          Carteirinha pública
        </h2>
        <p className="text-meta text-muted">
          Escolha o que aparece quando alguém escaneia o QR Code de {pet.name}.
        </p>
        <div className="flex flex-col gap-1">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-teal-ink"
              checked={pet.card.shareBreed}
              onChange={(event) =>
                updatePet(pet.id, {
                  card: { ...pet.card, shareBreed: event.target.checked },
                })
              }
            />
            <span className="text-[0.95rem] text-ink-soft">Mostrar raça</span>
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-teal-ink"
              checked={pet.card.shareCity}
              onChange={(event) =>
                updatePet(pet.id, {
                  card: { ...pet.card, shareCity: event.target.checked },
                })
              }
            />
            <span className="text-[0.95rem] text-ink-soft">
              Mostrar cidade aproximada
            </span>
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-teal-ink"
              checked={pet.card.shareHealth}
              onChange={(event) =>
                updatePet(pet.id, {
                  card: { ...pet.card, shareHealth: event.target.checked },
                })
              }
            />
            <span className="text-[0.95rem] text-ink-soft">
              Mostrar status de saúde (sem detalhes clínicos)
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.85rem] font-medium text-ink">
            Contato preferido na carteirinha
          </span>
          <input
            value={pet.card.contact ?? ""}
            onChange={(event) =>
              updatePet(pet.id, {
                card: { ...pet.card, contact: event.target.value || null },
              })
            }
            placeholder="(11) 90000-0000"
            maxLength={120}
            className="min-h-11 rounded-2xl border border-line px-3.5 text-[0.95rem] focus:border-teal-ink focus:outline-none"
          />
          <span className="text-meta text-muted">
            Prefira um número que você atende. Evite dados sensíveis.
          </span>
        </label>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-[1rem] font-semibold text-ink">Remover pet</h2>
        <p className="text-meta text-muted">
          Isso apaga registros, lembretes e diário de {pet.name} neste aparelho.
        </p>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(`Remover ${pet.name} e todo o histórico?`))
              return;
            useAppStore.getState().removePet(pet.id);
            toast.success(`${pet.name} foi removido`);
            router.replace("/pets");
          }}
          className="min-h-11 self-start rounded-full border border-danger/40 px-4 text-[0.9rem] font-medium text-danger-ink hover:bg-danger/5"
        >
          Remover {pet.name}
        </button>
      </Card>
    </div>
  );
}
