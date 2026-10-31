"use client";

import { ChevronRight, Eye, FileText, Printer, QrCode, ShieldCheck, Siren } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { ManagedCardPanel } from "@/components/managed-card-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { buildPublicCard } from "@/lib/domain/card";
import { todayKey } from "@/lib/domain/dates";
import { useAppStore } from "@/lib/store/app-store";

const PetShareStudio = dynamic(
  () =>
    import("@/components/pet-share-studio").then((mod) => mod.PetShareStudio),
  {
    loading: () => (
      <Card role="status" className="py-8 text-center text-meta text-muted">
        Preparando estúdio da carteirinha…
      </Card>
    ),
  },
);

const LostPetPosterModal = dynamic(() =>
  import("@/components/lost-pet-poster-modal").then(
    (mod) => mod.LostPetPosterModal,
  ),
);

const MicrochipGuideModal = dynamic(() =>
  import("@/components/microchip-guide-modal").then(
    (mod) => mod.MicrochipGuideModal,
  ),
);

export default function PetCardPage() {
  const params = useParams<{ petId: string }>();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const records = useAppStore((state) => state.records);
  const settings = useAppStore((state) => state.settings);
  const updatePet = useAppStore((state) => state.updatePet);
  const track = useAppStore((state) => state.track);
  const [url, setUrl] = useState<string | null>(null);
  const [posterModalOpen, setPosterModalOpen] = useState(false);
  const [microchipModalOpen, setMicrochipModalOpen] = useState(false);

  const handleSaveLostDetails = async (details: {
    neighborhood: string;
    contactPhone: string;
    reward: string;
    note: string;
  }) => {
    if (!pet) return;
    await updatePet(pet.id, {
      lostMode: {
        ...pet.lostMode,
        neighborhood: details.neighborhood || null,
        contactPhone: details.contactPhone || null,
        reward: details.reward || null,
        note: details.note || null,
      },
    });
  };

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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-12">
      <PageHeader
        title="Carteirinha"
        subtitle={`Crie a identidade visual de ${pet.name}`}
        backHref="/pets"
      />

      {/* Lost mode is the urgent path, so it leads the page. */}
      <Card
        className={`flex flex-col gap-3 ${pet.lostMode.active ? "border-danger/35 bg-danger-soft/50" : ""}`}
      >
        <CardTitle>{pet.name} se perdeu?</CardTitle>
        <p className="text-meta text-muted">
          O aviso aparece na imagem da carteirinha. Se você publicou um link,
          atualize a publicação depois de salvar.
        </p>
        <Button
          variant={pet.lostMode.active ? "danger" : "secondary"}
          onClick={async () => {
            try {
              const active = !pet.lostMode.active;
              await updatePet(pet.id, {
                lostMode: {
                  ...pet.lostMode,
                  active,
                  since: active ? todayKey() : null,
                  note: active
                    ? (pet.lostMode.note ??
                      "Se você encontrou este pet, confira as orientações de contato nesta cópia.")
                    : null,
                },
              });
              toast(
                active ? "Modo perdido ativado" : "Modo perdido desativado",
                {
                  description:
                    "Atualize a publicação gerenciada para mudar o link. Imagens e links antigos de cópia não mudam.",
                },
              );
              if (active) {
                setPosterModalOpen(true);
              }
            } catch (caught) {
              toast.error(
                caught instanceof Error
                  ? caught.message
                  : "Não foi possível salvar o modo perdido.",
              );
            }
          }}
        >
          <Siren aria-hidden="true" className="size-4" />
          {pet.lostMode.active
            ? "Desativar modo perdido"
            : "Ativar modo perdido"}
        </Button>

        {pet.lostMode.active ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-danger/30 bg-danger/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-danger-ink flex items-center gap-1.5">
                <Siren className="size-4" /> Cartaz de Pet Perdido Pronto
              </span>
              <Chip tone="danger">A4 e WhatsApp</Chip>
            </div>
            <p className="text-meta text-danger-ink/90">
              Baixe instantaneamente o cartaz A4 pronto para impressão com foto
              grande, QR Code e dados para contato.
            </p>
            <Button
              variant="danger"
              onClick={() => setPosterModalOpen(true)}
              className="gap-2 font-bold shadow-sm"
            >
              <Printer aria-hidden="true" className="size-4" />
              Baixar / Imprimir Cartaz A4 de Pet Perdido
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPosterModalOpen(true)}
            className="self-start gap-1.5 text-meta text-muted hover:text-ink"
          >
            <FileText aria-hidden="true" className="size-4" />
            Configurar / pré-visualizar cartaz de pet perdido
          </Button>
        )}

        {pet.lostMode.active && !pet.card.contact ? (
          <p
            role="status"
            className="text-meta leading-relaxed text-warning-ink"
          >
            Nenhum contato foi compartilhado. Sem ele, quem encontrar{" "}
            {pet.name} não consegue falar com você.{" "}
            <Link
              href={`/pets/${pet.id}/edit`}
              className="font-semibold underline"
            >
              Adicionar contato
            </Link>
          </p>
        ) : null}
      </Card>


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
            href={url}
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

      <ManagedCardPanel petId={pet.id} card={publicCard} onLink={setUrl} />

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle>Microchip e Bancos Nacionais</CardTitle>
          {pet.microchip ? (
            <Chip tone="teal">Cadastrado</Chip>
          ) : (
            <Chip tone="muted">Não cadastrado</Chip>
          )}
        </div>
        <p className="text-meta leading-relaxed text-muted">
          No Brasil, a leitura de microchip pode ser feita gratuitamente em
          qualquer clínica veterinária ou CCZ. Verifique se o número do seu pet
          está registrado em bancos como SIRAA, Abrasp e PetMaxx.
        </p>
        {pet.microchip ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface p-3">
            <span className="font-mono text-sm font-bold text-ink">
              Microchip: {pet.microchip}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMicrochipModalOpen(true)}
              className="gap-1.5"
            >
              Abrir Guia de Microchips
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-meta text-muted">
              Seu pet já tem microchip? Cadastre o código nas configurações do
              pet.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMicrochipModalOpen(true)}
              className="gap-1.5"
            >
              Conhecer bancos de microchip
            </Button>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-4 text-teal-ink" />
          <CardTitle>O que aparece em cada versão</CardTitle>
        </div>
        <p className="text-meta leading-relaxed text-muted">
          Nome e espécie identificam o pet na página pública e na imagem. A
          foto fica neste aparelho e só entra na imagem baixada. Os demais
          dados seguem suas escolhas de privacidade.
        </p>
        <ul className="flex flex-col gap-1 text-label text-ink-soft">
          <li className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            Nome e espécie do pet
            <Chip tone="teal">Sempre visível</Chip>
          </li>
          <li className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            Foto do pet
            <Chip tone="teal">Só na imagem</Chip>
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
          Novos links gerenciados expiram e podem ser revogados ou atualizados
          acima. Mudar a privacidade local não publica nada automaticamente.
          Links antigos que contêm uma cópia dos dados continuam imutáveis e não
          podem ser revogados. Imagens e capturas já salvas também permanecem.
        </p>
        <Link
          href={`/pets/${pet.id}/edit`}
          className="inline-flex items-center gap-1 text-meta font-medium text-teal-ink"
        >
          Ajustar privacidade
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </Card>

      <LostPetPosterModal
        pet={pet}
        publicUrl={url}
        open={posterModalOpen}
        onClose={() => setPosterModalOpen(false)}
        onSaveLostDetails={handleSaveLostDetails}
      />

      <MicrochipGuideModal
        microchip={pet.microchip}
        petName={pet.name}
        open={microchipModalOpen}
        onClose={() => setMicrochipModalOpen(false)}
      />
    </div>
  );
}
