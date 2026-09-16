"use client";

import {
  Camera,
  ChevronRight,
  FileText,
  Pencil,
  QrCode,
  Scale,
  Siren,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { formatShortDate, todayKey } from "@/lib/domain/dates";
import { weightTrend } from "@/lib/domain/health";
import { petAge, petCompletion } from "@/lib/domain/pet";
import { speciesLabels } from "@/lib/domain/labels";
import { useAppStore } from "@/lib/store/app-store";
import { useActivePet, useHydrated, usePetRecords } from "@/lib/store/hooks";

export default function MyPetPage() {
  const ready = useHydrated();
  const router = useRouter();
  const pet = useActivePet();
  const records = usePetRecords(pet?.id ?? null);
  const diary = useAppStore((state) => state.diary);
  const updatePet = useAppStore((state) => state.updatePet);

  const petDiary = useMemo(
    () => diary.filter((entry) => entry.petId === pet?.id),
    [diary, pet?.id],
  );
  const trend = useMemo(() => weightTrend(records), [records]);
  const documents = useMemo(
    () => records.filter((record) => record.attachmentName),
    [records],
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
        <PetContextSwitcher
          scope={pet.id}
          onScopeChange={(scope) => {
            if (scope !== "todos" && scope !== pet.id)
              router.push(`/pets/${scope}`);
          }}
        />
      </div>

      <CareTabs active={null} pet={pet} />

      <section className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[26px] border border-accent/25 bg-gradient-to-br from-accent-soft via-canvas to-info-soft p-6 text-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 -top-12 size-32 rounded-full bg-warning-soft blur-2xl"
        />
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
            href={`/pets/${pet.id}/card`}
            size="sm"
            variant="secondary"
          >
            <QrCode aria-hidden="true" className="size-4" />
            Carteirinha
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

        <button
          type="button"
          onClick={() => {
            const active = !pet.lostMode.active;
            updatePet(pet.id, {
              lostMode: {
                active,
                since: active ? todayKey() : null,
                note: active
                  ? (pet.lostMode.note ??
                    "Se você encontrou este pet, use o contato da carteirinha.")
                  : null,
              },
            });
            toast(active ? "Modo perdido ativado" : "Modo perdido desativado", {
              description: active
                ? "A carteirinha pública passa a mostrar o aviso e o contato."
                : "A carteirinha volta ao estado normal.",
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
          <CardTitle>Peso</CardTitle>
          <Link
            href={`/pets/${pet.id}/health/new?type=peso`}
            className="text-meta font-medium text-teal-ink"
          >
            Registrar novo peso
          </Link>
        </div>
        {trend ? (
          <div className="flex items-end gap-3">
            <p className="text-2xl font-semibold text-ink">
              {trend.latest.toFixed(1).replace(".", ",")} kg
            </p>
            <p className="pb-1 text-meta text-muted">
              {trend.previous
                ? `${trend.deltaKg === 0 ? "estável" : trend.deltaKg > 0 ? `+${trend.deltaKg}` : trend.deltaKg} kg desde ${trend.sinceLabel}`
                : "Primeira pesagem registrada"}
            </p>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-[0.92rem] text-muted">
            <Scale aria-hidden="true" className="size-4" />
            Sem pesagens registradas ainda.
          </p>
        )}
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
            description="O diário é privado por padrão e você escolhe o que publica na comunidade."
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
            {documents.length === 0
              ? "Anexe fotos de exames e da carteirinha de vacinação."
              : `${documents.length} arquivo${documents.length > 1 ? "s" : ""} anexado${documents.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href={`/pets/${pet.id}/documents`}
          className="text-meta font-medium text-teal-ink"
        >
          Abrir
        </Link>
      </Card>

      <QuickAddButton href={`/pets/${pet.id}/health/new`} />
    </div>
  );
}
