"use client";

import {
  Camera,
  ChevronRight,
  FileText,
  HeartHandshake,
  Pencil,
  Printer,
  QrCode,
  Scale,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
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
import { SkeletonScreen } from "@/components/ui/skeleton";
import { formatShortDate, todayKey } from "@/lib/domain/dates";
import { weightTrend } from "@/lib/domain/health";
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

  const petDiary = useMemo(
    () => diary.filter((entry) => entry.petId === pet?.id),
    [diary, pet?.id],
  );
  const weightMeasurements = useMemo(
    () => (pet ? petWeightMeasurements(pet, records, petDiary) : []),
    [pet, records, petDiary],
  );
  const trend = useMemo(
    () =>
      pet?.weightKg != null
        ? weightTrend(
            weightMeasurements,
            pet.weightKg,
          )
        : null,
    [pet, weightMeasurements],
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

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-meta font-bold uppercase tracking-[0.14em] text-muted">
            Cuidados
          </p>
          <h1 className="mt-1 font-editorial text-[2.25rem] font-semibold leading-none tracking-tight text-ink">
            Perfil do pet
          </h1>
        </div>
        <PetContextSwitcher scope={pet.id} />
      </div>

      <CareTabs active={null} pet={pet} />

      <section className="flex flex-col items-center gap-3 rounded-[24px] border border-line bg-paper p-6 text-center">
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
          <p className="text-[0.92rem] text-muted">
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
            href={`/pets/${pet.id}/vet`}
            size="sm"
            variant="secondary"
            className="font-semibold text-teal-ink"
          >
            <Stethoscope aria-hidden="true" className="size-4" />
            Modo Consulta
          </ButtonLink>
          <ButtonLink
            href={`/pets/${pet.id}/card`}
            size="sm"
            variant="secondary"
          >
            <QrCode aria-hidden="true" className="size-4" />
            Carteirinha
          </ButtonLink>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowSitterModal(true)}
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            Modo Cuidador
          </Button>
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
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.85rem] font-medium ${
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
              Baixar Cartaz A4
            </ButtonLink>
          ) : null}
        </div>
      </section>

      {completion.missing.length > 0 ? (
        <Link
          href={`/pets/${pet.id}/edit`}
          className="flex items-center gap-3 rounded-3xl border border-dashed border-line bg-surface/60 p-4"
        >
          <Sparkles
            aria-hidden="true"
            className="size-5 shrink-0 text-teal-ink"
          />
          <p className="flex-1 text-[0.92rem] text-ink-soft">
            Faltam {completion.missing.length} detalhes para completar a
            carteirinha: {completion.missing.slice(0, 3).join(", ")}.
          </p>
          <ChevronRight aria-hidden="true" className="size-4 text-muted" />
        </Link>
      ) : null}

      <HealthStatusCard records={records} href={`/pets/${pet.id}/health`} />

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Curva de peso</CardTitle>
          <Link
            href={`/pets/${pet.id}/health/new?type=peso`}
            className="text-meta font-medium text-teal-ink"
          >
            Registrar novo peso
          </Link>
        </div>
        <WeightChart
          measurements={weightMeasurements}
          targetWeightKg={pet.targetWeightKg}
          petName={pet.name}
        />
      </Card>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <CardTitle>Últimos registros</CardTitle>
          <Link
            href={`/pets/${pet.id}/health`}
            className="text-meta font-medium text-teal-ink"
          >
            Ver saúde
          </Link>
        </div>
        {records.length === 0 ? (
          <EmptyState
            icon={<Camera aria-hidden="true" className="size-5" />}
            title="Histórico vazio"
            description="Cada vacina, consulta ou pesagem registrada aparece aqui na linha do tempo."
            action={
              <ButtonLink href={`/pets/${pet.id}/health/new`} size="sm">
                Adicionar registro
              </ButtonLink>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {sortedRecords(records)
              .slice(0, 4)
              .map((record) => (
                <RecordTimelineItem key={record.id} record={record} />
              ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <CardTitle>Diário</CardTitle>
          <Link
            href={`/pets/${pet.id}/diary`}
            className="text-meta font-medium text-teal-ink"
          >
            Abrir diário
          </Link>
        </div>
        {petDiary.length === 0 ? (
          <EmptyState
            title="Nenhum momento guardado"
            description="Guarde seus momentos neste aparelho. O diário não publica conteúdo na comunidade."
            action={
              <ButtonLink
                href={`/pets/${pet.id}/diary`}
                size="sm"
                variant="secondary"
              >
                Adicionar primeiro momento
              </ButtonLink>
            }
          />
        ) : (
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
        )}
      </section>

      <Card className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-surface text-ink-soft">
          <FileText aria-hidden="true" className="size-5" />
        </span>
        <div className="flex-1">
          <CardTitle>Documentos</CardTitle>
          <p className="text-meta text-muted">
            {documentCount === 0
              ? "Guarde PDFs, exames, receitas e carteirinhas."
              : `${documentCount} arquivo${documentCount > 1 ? "s" : ""} guardado${documentCount > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href={`/pets/${pet.id}/documents`}
          className="text-meta font-medium text-teal-ink"
        >
          Abrir
        </Link>
      </Card>

      {/* Colaboração Familiar e Multi-Tutor */}
      <PetCollaboratorsPanel pet={pet} />

      {/* Modo Cuidador / Pet Sitter */}
      <Card className="flex flex-col gap-3 border-teal-ink/20 bg-teal-ink/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-teal-ink text-white">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <div>
              <CardTitle>Modo Cuidador / Pet Sitter</CardTitle>
              <p className="mt-0.5 text-meta text-muted">
                Para quando o pet fica em hotelzinho, creche ou com passeador.
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">
          Gere um link temporário protegido por PIN que mostra apenas a rotina alimentar, horários de remédios, alergias e botão de emergência 24h, sem expor dados particulares.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={() => setShowSitterModal(true)}>
            Configurar link do cuidador
          </Button>
          <ButtonLink
            href={`/pets/${pet.id}/sitter`}
            variant="secondary"
            size="sm"
          >
            Ativar neste aparelho
          </ButtonLink>
        </div>
      </Card>

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
