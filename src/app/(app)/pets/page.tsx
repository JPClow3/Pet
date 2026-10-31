"use client";

import {
  Camera,
  ChevronRight,
  FileText,
  Pencil,
  Printer,
  QrCode,
  Scale,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
  Syringe,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CareTabs } from "@/components/care-tabs";
import {
  HealthStatusCard,
  RecordTimelineItem,
  sortedRecords,
} from "@/components/health-status-card";
import { CareHalo } from "@/components/pet-avatar";
import { PetContextSwitcher } from "@/components/pet-header";
import { Photo } from "@/components/ui/photo";
import { QuickAddButton } from "@/components/quick-add-button";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { BottomSheet } from "@/components/ui/sheet";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { formatShortDate, todayKey } from "@/lib/domain/dates";
import { petWeightMeasurements } from "@/lib/domain/weight";

const PetCollaboratorsPanel = dynamic(() =>
  import("@/components/pet-collaborators-panel").then(
    (mod) => mod.PetCollaboratorsPanel,
  ),
);

const PetSitterConfigModal = dynamic(() =>
  import("@/components/pet-sitter-config-modal").then(
    (mod) => mod.PetSitterConfigModal,
  ),
);

const WeightChart = dynamic(
  () => import("@/components/weight-chart").then((mod) => mod.WeightChart),
  {
    loading: () => (
      <div role="status" className="py-6 text-center text-meta text-muted">
        Carregando gráfico de peso…
      </div>
    ),
  },
);
import { petAge, petCompletion } from "@/lib/domain/pet";
import { speciesLabels } from "@/lib/domain/labels";
import { useAppStore } from "@/lib/store/app-store";
import { useActivePet, useHydrated, usePetRecords } from "@/lib/store/hooks";
import { useAsyncAction } from "@/lib/use-async-action";

export default function MyPetPage() {
  const ready = useHydrated();
  const pet = useActivePet();
  const records = usePetRecords(pet?.id ?? null);
  const diary = useAppStore((state) => state.diary);
  const independentDocuments = useAppStore((state) => state.documents);
  const updatePet = useAppStore((state) => state.updatePet);
  const action = useAsyncAction();
  const router = useRouter();
  const [showSitterModal, setShowSitterModal] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  const petDiary = useMemo(
    () => diary.filter((entry) => entry.petId === pet?.id),
    [diary, pet?.id],
  );
  const weightMeasurements = useMemo(
    () => (pet ? petWeightMeasurements(pet, records, petDiary) : []),
    [pet, records, petDiary],
  );
  const documentCount = useMemo(
    () =>
      records.filter((record) => record.attachmentName).length +
      independentDocuments.filter(
        (document) => document.petId === pet?.id && !document.deletedAt,
      ).length,
    [records, independentDocuments, pet?.id],
  );

  if (!ready) return <SkeletonScreen label="Abrindo o perfil" />;

  if (!pet) {
    return (
      <EmptyState
        title="Nenhum pet por aqui"
        description="Crie o perfil do seu pet para começar a guardar a história dele."
        action={<ButtonLink href="/pets/new">Criar perfil</ButtonLink>}
      />
    );
  }

  const age = petAge(pet.birthDate);
  const completion = petCompletion(pet);
  const nextDetail = !pet.card.contact
    ? "Adicione um contato para deixar a carteirinha útil"
    : completion.missing.length > 0
      ? `Adicione ${completion.missing[0]} ao perfil de ${pet.name}`
      : null;
  const startItems = [
    records.length === 0 && {
      href: `/pets/${pet.id}/health/new?type=vacina`,
      label: "Registrar a vacina mais recente",
      icon: Syringe,
    },
    weightMeasurements.length === 0 && {
      href: `/pets/${pet.id}/health/new?type=peso`,
      label: "Registrar o peso",
      icon: Scale,
    },
    petDiary.length === 0 && {
      href: `/pets/${pet.id}/diary`,
      label: "Guardar um momento no diário",
      icon: Camera,
    },
  ].filter((item) => item !== false);

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-meta font-bold uppercase tracking-[0.14em] text-muted">
            Cuidados
          </p>
          <h1 className="mt-1 font-editorial text-h1 font-semibold leading-none tracking-tight text-ink">
            Perfil do pet
          </h1>
        </div>
        <PetContextSwitcher scope={pet.id} />
      </div>

      <CareTabs active="perfil" pet={pet} />

      <section className="flex flex-col items-center gap-3 rounded-feature border border-line bg-paper p-6 text-center">
        <CareHalo
          pet={pet}
          records={records}
          size="lg"
          label={`Agenda de cuidados de ${pet.name}`}
        />
        <div>
          <h2 className="font-editorial text-3xl font-semibold text-ink">
            {pet.name}
          </h2>
          <p className="text-body text-muted">
            {[
              speciesLabels[pet.species],
              pet.breed,
              age?.label,
              pet.sex === "nao_informado"
                ? null
                : pet.sex === "macho"
                  ? "macho"
                  : "fêmea",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {pet.color ? <Chip tone="muted">{pet.color}</Chip> : null}
          {pet.microchip ? (
            <Chip tone="mint">Microchip {pet.microchip}</Chip>
          ) : null}
          {pet.lostMode.active ? (
            <Chip tone="danger">Modo perdido ativo</Chip>
          ) : null}
        </div>

        <div className="flex w-full flex-wrap justify-center gap-2 pt-1">
          <ButtonLink
            href={`/pets/${pet.id}/card`}
            size="sm"
            variant="secondary"
          >
            <QrCode aria-hidden="true" className="size-4" />
            Carteirinha
          </ButtonLink>
          <ButtonLink
            href={`/pets/${pet.id}/vet`}
            size="sm"
            variant="secondary"
          >
            <Stethoscope aria-hidden="true" className="size-4" />
            Modo consulta
          </ButtonLink>
          <ButtonLink
            href={`/pets/${pet.id}/edit`}
            size="sm"
            variant="secondary"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Editar
          </ButtonLink>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={action.pending}
            onClick={() => {
              const active = !pet.lostMode.active;
              void action.run(async () => {
                await updatePet(pet.id, {
                  lostMode: {
                    ...pet.lostMode,
                    active,
                    since: active ? todayKey() : null,
                    note: active
                      ? (pet.lostMode.note ??
                        "Se você encontrou este pet, use o contato da carteirinha.")
                      : null,
                  },
                });
                toast(
                  active
                    ? "Modo perdido ativado neste aparelho"
                    : "Modo perdido desativado neste aparelho",
                  {
                    description:
                      "Abra a carteirinha e revise a publicação para atualizar o link público.",
                    action: {
                      label: "Revisar publicação",
                      onClick: () => router.push(`/pets/${pet.id}/card`),
                    },
                  },
                );
              });
            }}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-label font-medium ${
              pet.lostMode.active
                ? "bg-danger-ink text-white"
                : "border border-line text-danger-ink hover:bg-danger/5"
            }`}
          >
            <Siren aria-hidden="true" className="size-4" />
            {pet.lostMode.active
              ? "Desativar modo perdido"
              : "Ativar modo perdido"}
          </button>
          {pet.lostMode.active ? (
            <ButtonLink
              href={`/pets/${pet.id}/card`}
              variant="secondary"
              className="border-danger-ink/40 text-danger-ink hover:bg-danger/10 font-bold"
            >
              <Printer aria-hidden="true" className="size-4" />
              Baixar cartaz
            </ButtonLink>
          ) : null}
        </div>
      </section>

      {/* The single most useful missing detail, not a count. */}
      {nextDetail ? (
        <Link
          href={`/pets/${pet.id}/edit`}
          className="flex min-h-14 items-center gap-3 rounded-card border border-dashed border-line bg-surface/60 p-4"
        >
          <Sparkles
            aria-hidden="true"
            className="size-5 shrink-0 text-teal-ink"
          />
          <p className="flex-1 text-label text-ink-soft">{nextDetail}</p>
          <ChevronRight aria-hidden="true" className="size-4 text-muted" />
        </Link>
      ) : null}

      {/* Empty modules collapse into one checklist instead of stacked empty states. */}
      {startItems.length > 0 ? (
        <Card className="flex flex-col gap-1 p-4">
          <CardTitle className="mb-1">Comece por aqui</CardTitle>
          <ul className="flex flex-col">
            {startItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-12 items-center gap-3 border-b border-line/70 py-2 text-label font-semibold text-ink last:border-b-0"
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-5 shrink-0 text-teal-ink"
                    />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 text-muted"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {records.length > 0 ? (
        <HealthStatusCard records={records} href={`/pets/${pet.id}/health`} />
      ) : null}

      {weightMeasurements.length > 0 ? (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Curva de peso</CardTitle>
            <Link
              href={`/pets/${pet.id}/health/new?type=peso`}
              className="inline-flex min-h-11 items-center text-meta font-medium text-teal-ink"
            >
              Registrar peso
            </Link>
          </div>
          <WeightChart
            measurements={weightMeasurements}
            targetWeightKg={pet.targetWeightKg}
            petName={pet.name}
          />
        </Card>
      ) : null}

      {records.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <CardTitle>Últimos registros</CardTitle>
            <Link
              href={`/pets/${pet.id}/health`}
              className="inline-flex min-h-11 items-center text-meta font-medium text-teal-ink"
            >
              Ver histórico
            </Link>
          </div>
          <ul className="flex flex-col gap-3">
            {sortedRecords(records)
              .slice(0, 4)
              .map((record) => (
                <RecordTimelineItem key={record.id} record={record} />
              ))}
          </ul>
        </section>
      ) : null}

      {petDiary.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <CardTitle>Diário</CardTitle>
            <Link
              href={`/pets/${pet.id}/diary`}
              className="inline-flex min-h-11 items-center text-meta font-medium text-teal-ink"
            >
              Abrir diário
            </Link>
          </div>
          <ul className="flex gap-2 overflow-x-auto no-scrollbar">
            {petDiary.slice(0, 6).map((entry) => (
              <li key={entry.id} className="w-32 shrink-0">
                {entry.photo ? (
                  <Photo
                    src={entry.photo}
                    alt={entry.text}
                    className="h-24 w-full rounded-2xl"
                  />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-2xl bg-surface p-2 text-center text-meta text-muted">
                    {entry.text.slice(0, 40)}
                  </div>
                )}
                <p className="mt-1 text-meta text-muted">
                  {formatShortDate(entry.date)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Card className="flex flex-col p-2">
        <Link
          href={`/pets/${pet.id}/documents`}
          className="flex min-h-14 items-center gap-3 rounded-control px-2"
        >
          <FileText
            aria-hidden="true"
            className="size-5 shrink-0 text-ink-soft"
          />
          <span className="flex-1">
            <span className="block text-label font-semibold text-ink">
              Documentos
            </span>
            <span className="block text-meta text-muted">
              {documentCount === 0
                ? "Exames, receitas e carteirinhas"
                : `${documentCount} arquivo${documentCount > 1 ? "s" : ""}`}
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="size-4 text-muted" />
        </Link>
        <button
          type="button"
          onClick={() => setShowShareSheet(true)}
          className="flex min-h-14 items-center gap-3 rounded-control border-t border-line/70 px-2 text-left"
        >
          <Users aria-hidden="true" className="size-5 shrink-0 text-ink-soft" />
          <span className="flex-1">
            <span className="block text-label font-semibold text-ink">
              Compartilhar cuidados
            </span>
            <span className="block text-meta text-muted">
              Família, cuidadores e modo cuidador
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="size-4 text-muted" />
        </button>
      </Card>

      <BottomSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title="Compartilhar cuidados"
        description={`Quem mais cuida de ${pet.name}?`}
      >
        <div className="flex flex-col gap-4">
          <PetCollaboratorsPanel pet={pet} />
          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck
                aria-hidden="true"
                className="size-5 shrink-0 text-teal-ink"
              />
              <CardTitle>Modo cuidador</CardTitle>
            </div>
            <p className="text-label leading-relaxed text-ink-soft">
              Um link com PIN para hotelzinho, creche ou passeador. Mostra só
              rotina, remédios, alergias e contato de emergência.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setShowShareSheet(false);
                  setShowSitterModal(true);
                }}
              >
                Criar link do cuidador
              </Button>
              <ButtonLink
                href={`/pets/${pet.id}/sitter`}
                variant="secondary"
                size="sm"
              >
                Usar neste aparelho
              </ButtonLink>
            </div>
          </Card>
        </div>
      </BottomSheet>

      <PetSitterConfigModal
        pet={pet}
        records={records}
        open={showSitterModal}
        onClose={() => setShowSitterModal(false)}
      />

      <QuickAddButton href={`/pets/${pet.id}/health/new`} />
    </div>
  );
}
