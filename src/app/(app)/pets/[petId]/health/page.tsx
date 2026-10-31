"use client";

import { ClipboardList, Plus, Stethoscope } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { RecordTimelineItem } from "@/components/health-status-card";
import { BulkAddToCalendarButton } from "@/components/add-to-calendar";
import { createBulkCalendarEvents } from "@/lib/calendar";
import { CareHeader } from "@/components/care-tabs";
import { PetContextSwitcher } from "@/components/pet-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/chip";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { countByType, healthStatus, sortByDateDesc } from "@/lib/domain/health";
import { formatShortDate } from "@/lib/domain/dates";
import { HEALTH_TYPES, healthTypeMeta } from "@/lib/domain/labels";
import { petWeightMeasurements } from "@/lib/domain/weight";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";
import type { HealthRecordType } from "@/lib/domain/schema";

const HistoryExportPanel = dynamic(
  () =>
    import("@/components/history-export-panel").then(
      (mod) => mod.HistoryExportPanel,
    ),
  { loading: () => null },
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

export default function HealthPage() {
  const params = useParams<{ petId: string }>();
  const router = useRouter();
  const ready = useHydrated();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const records = useAppStore((state) => state.records);
  const diary = useAppStore((state) => state.diary);
  const [filter, setFilter] = useState<HealthRecordType | "todos" | "proximos">(
    "todos",
  );

  const petRecords = useMemo(
    () => records.filter((record) => record.petId === params.petId),
    [records, params.petId],
  );

  const filtered = useMemo(() => {
    const sorted = sortByDateDesc(petRecords);
    if (filter === "todos") return sorted;
    if (filter === "proximos") {
      return sorted.filter((record) => record.nextDueDate !== null);
    }
    return sorted.filter((record) => record.type === filter);
  }, [petRecords, filter]);

  const status = useMemo(() => healthStatus(petRecords), [petRecords]);
  const counts = useMemo(() => countByType(petRecords), [petRecords]);
  const petCalendarEvents = useMemo(
    () =>
      pet
        ? createBulkCalendarEvents({
            records: petRecords,
            pets: [pet],
          })
        : [],
    [petRecords, pet],
  );

  if (!ready) return <SkeletonScreen label="Abrindo a saúde" />;

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
    <div className="flex flex-col gap-4 pb-24">
      <CareHeader
        active="historico"
        pet={pet}
        context={
          <PetContextSwitcher
            scope={pet.id}
            onScopeChange={(scope) => {
              if (scope !== "todos" && scope !== pet.id)
                router.push(`/pets/${scope}/health`);
            }}
          />
        }
        action={
          <ButtonLink href={`/pets/${pet.id}/health/new`} size="sm">
            <Plus aria-hidden="true" className="size-4" />
            Registrar
          </ButtonLink>
        }
      />

      {petRecords.length > 0 ? (
        <Card className="flex flex-col gap-1">
          <p className="text-meta font-semibold text-muted">Situação atual</p>
          <p className="text-h3 font-semibold text-ink">{status.headline}</p>
          <p className="text-label text-ink-soft/90">{status.detail}</p>
        </Card>
      ) : null}

      {petRecords.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        <FilterChip
          selected={filter === "todos"}
          onClick={() => setFilter("todos")}
        >
          Todos ({petRecords.length})
        </FilterChip>
        <FilterChip
          selected={filter === "proximos"}
          onClick={() => setFilter("proximos")}
        >
          Com próxima data
        </FilterChip>
        {HEALTH_TYPES.filter((type) => (counts[type] ?? 0) > 0).map((type) => (
          <FilterChip
            key={type}
            selected={filter === type}
            onClick={() => setFilter(type)}
          >
            {healthTypeMeta[type].plural} ({counts[type]})
          </FilterChip>
        ))}
      </div>
      ) : null}

      {filter === "peso" ? (
        <Card className="flex flex-col gap-3">
          <WeightChart
            measurements={petWeightMeasurements(
              pet,
              petRecords,
              diary.filter((entry) => entry.petId === pet.id),
            )}
            targetWeightKg={pet.targetWeightKg}
            petName={pet.name}
          />
        </Card>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList aria-hidden="true" className="size-5" />}
          title={
            petRecords.length === 0
              ? "Nenhum registro ainda"
              : "Nada neste filtro"
          }
          description={
            petRecords.length === 0
              ? "Registre vacinas, consultas e pesagens. Depois a Zelupi avisa antes de cada vencimento."
              : "Tente outro tipo de registro ou limpe o filtro."
          }
          action={
            petRecords.length === 0 ? (
              <ButtonLink
                href={`/pets/${pet.id}/health/new`}
                variant="secondary"
              >
                Adicionar registro
              </ButtonLink>
            ) : (
              <button
                type="button"
                onClick={() => setFilter("todos")}
                className="min-h-11 rounded-full border border-line px-4 text-label font-medium text-ink"
              >
                Limpar filtro
              </button>
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((record) => (
            <li key={record.id}>
              <Link
                href={`/pets/${pet.id}/health/${record.id}`}
                className="block"
              >
                <RecordTimelineItem record={record} />
              </Link>
              {record.nextDueDate ? (
                <p className="pl-12 text-meta text-muted">
                  Aviso {record.leadDays} dias antes de{" "}
                  {formatShortDate(record.nextDueDate)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line/80 pt-4">
        <ButtonLink href={`/pets/${pet.id}/vet`} variant="secondary" size="sm">
          <Stethoscope aria-hidden="true" className="size-4" />
          Modo consulta
        </ButtonLink>
        {petRecords.length > 0 ? (
          <HistoryExportPanel key={pet.id} pet={pet} records={petRecords} />
        ) : null}
        {petCalendarEvents.length > 0 ? (
          <BulkAddToCalendarButton
            events={petCalendarEvents}
            filename={`cuidados-${pet.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-zelupi.ics`}
            calendarName={`Zelupi — Cuidados de ${pet.name}`}
            label="Adicionar à agenda do celular"
            size="sm"
          />
        ) : null}
      </div>

      <p className="text-meta text-muted">
        A Zelupi organiza o que você registra. Ela não diagnostica nem substitui
        a avaliação de um veterinário.
      </p>
    </div>
  );
}
