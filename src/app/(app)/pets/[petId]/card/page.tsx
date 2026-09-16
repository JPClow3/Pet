"use client";

import { ChevronRight, Eye, ShieldCheck, Siren } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { PetShareStudio } from "@/components/pet-share-studio";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { buildPublicCard, publicCardPath } from "@/lib/domain/card";
import { todayKey } from "@/lib/domain/dates";
import { useOriginUrl } from "@/lib/geo";
import { useAppStore } from "@/lib/store/app-store";

export default function PetCardPage() {
  const params = useParams<{ petId: string }>();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const records = useAppStore((state) => state.records);
  const settings = useAppStore((state) => state.settings);
  const updatePet = useAppStore((state) => state.updatePet);
  const track = useAppStore((state) => state.track);
  const origin = useOriginUrl();

  useEffect(() => {
    if (pet) track("qr_viewed", { petId: pet.id });
  }, [pet, track]);

  const petRecords = useMemo(
    () => records.filter((record) => record.petId === params.petId),
    [records, params.petId],
  );

  const publicCard = useMemo(
    () =>
      pet
        ? buildPublicCard({ pet, records: petRecords, city: settings.city })
        : null,
    [pet, petRecords, settings.city],
  );

  if (!pet || !publicCard) {
    return (
      <EmptyState
        title="Pet não encontrado"
        description="Esse perfil pode ter sido removido deste aparelho."
        action={<ButtonLink href="/pets">Voltar</ButtonLink>}
      />
    );
  }

  const path = publicCardPath(publicCard);
  const url = origin ? `${origin}${path}` : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-12">
      <PageHeader
        title="Carteirinha"
        subtitle={`Crie a identidade visual de ${pet.name}`}
        backHref="/pets"
      />

      <PetShareStudio
        card={publicCard}
        photo={pet.photo}
        publicUrl={url}
        onTrack={(action) => track("qr_shared", { petId: pet.id, action })}
      />

      {url ? (
        <Card className="flex flex-col gap-3 border-blue/20 bg-blue-soft/45 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue text-white">
              <Eye aria-hidden="true" className="size-5" />
            </span>
            <div>
              <CardTitle>Página pública</CardTitle>
              <p className="mt-1 text-meta leading-relaxed text-muted">
                Confira a experiência de quem escanear a carteirinha.
              </p>
            </div>
          </div>
          <ButtonLink
            href={path}
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() =>
              track("qr_shared", { petId: pet.id, action: "preview" })
            }
          >
            Ver página pública
            <ChevronRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3">
        <CardTitle>Modo perdido</CardTitle>
        <p className="text-meta text-muted">
          Com o modo ativo, a página pública mostra o aviso, a data de ativação
          e o seu contato preferido.
        </p>
        <Button
          variant={pet.lostMode.active ? "danger" : "secondary"}
          onClick={() => {
            const active = !pet.lostMode.active;
            updatePet(pet.id, {
              lostMode: {
                active,
                since: active ? todayKey() : null,
                note: active
                  ? (pet.lostMode.note ??
                    "Se você encontrou este pet, use o contato abaixo.")
                  : null,
              },
            });
            toast(active ? "Modo perdido ativado" : "Modo perdido desativado");
          }}
        >
          <Siren aria-hidden="true" className="size-4" />
          {pet.lostMode.active
            ? "Desativar modo perdido"
            : "Ativar modo perdido"}
        </Button>
      </Card>

      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-4 text-teal-ink" />
          <CardTitle>O que aparece em cada versão</CardTitle>
        </div>
        <p className="text-meta leading-relaxed text-muted">
          Nome e espécie identificam o pet na página pública e no PNG. A foto
          permanece local e entra somente na imagem exportada. Os demais dados
          seguem suas escolhas de privacidade.
        </p>
        <ul className="flex flex-col gap-1 text-[0.9rem] text-ink-soft">
          <li className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            Nome e espécie do pet
            <Chip tone="teal">Sempre visível</Chip>
          </li>
          <li className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            Foto do pet
            <Chip tone="teal">Somente no PNG</Chip>
          </li>
          <li className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            Raça
            <Chip tone={pet.card.shareBreed ? "teal" : "muted"}>
              {pet.card.shareBreed ? "Visível" : "Oculto"}
            </Chip>
          </li>
          <li className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            Cidade aproximada
            <Chip tone={pet.card.shareCity ? "teal" : "muted"}>
              {pet.card.shareCity ? "Visível" : "Oculto"}
            </Chip>
          </li>
          <li className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            Situação da saúde
            <Chip tone={pet.card.shareHealth ? "teal" : "muted"}>
              {pet.card.shareHealth ? "Resumo" : "Oculto"}
            </Chip>
          </li>
          <li className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            Contato
            <Chip tone={pet.card.contact ? "teal" : "muted"}>
              {pet.card.contact ? "Visível" : "Não informado"}
            </Chip>
          </li>
        </ul>
        <p className="rounded-2xl bg-surface px-3 py-2 text-meta leading-relaxed text-muted">
          A imagem e o QR são um retrato dos dados atuais. Gere uma nova
          carteirinha depois de alterar a privacidade ou o perfil.
        </p>
        <Link
          href={`/pets/${pet.id}/edit`}
          className="inline-flex items-center gap-1 text-meta font-medium text-teal-ink"
        >
          Ajustar privacidade
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </Card>
    </div>
  );
}
