"use client";

import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { RecordTimelineItem } from "@/components/health-status-card";
import { CareTabs } from "@/components/care-tabs";
import { PageHeader } from "@/components/page-header";
import { PetContextSwitcher } from "@/components/pet-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/chip";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { countByType, healthStatus, sortByDateDesc } from "@/lib/domain/health";
import { formatShortDate } from "@/lib/domain/dates";
import { HEALTH_TYPES, healthTypeMeta } from "@/lib/domain/labels";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";
import type { HealthRecordType } from "@/lib/domain/schema";

export default function HealthPage() {
  const params = useParams<{ petId: string }>();
  const router = useRouter();
  const ready = useHydrated();
  const pet = useAppStore((state) =>
    state.pets.find((item) => item.id === params.petId),
  );
  const records = useAppStore((state) => state.records);
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
      <div className="flex items-center justify-between gap-3">
        <span className="text-meta font-bold uppercase tracking-[0.14em] text-muted">
          Cuidados
        </span>
        <PetContextSwitcher
          scope={pet.id}
          onScopeChange={(scope) => {
            if (scope !== "todos" && scope !== pet.id)
              router.push(`/pets/${scope}/health`);
          }}
        />
      </div>
      <CareTabs active="historico" pet={pet} />
      <PageHeader
        title="Saúde"
        subtitle={`Histórico de ${pet.name}`}
        backHref="/pets"
        action={
          <ButtonLink href={`/pets/${pet.id}/health/new`} size="sm">
            <Plus aria-hidden="true" className="size-4" />
            Novo
          </ButtonLink>
        }
      />

      <Card className="flex flex-col gap-1">
        <p className="text-meta font-semibold uppercase tracking-wide text-muted">
          Situação atual
        </p>
        <p className="text-[1.05rem] font-semibold text-ink">
          {status.headline}
        </p>
        <p className="text-[0.9rem] text-ink-soft/90">{status.detail}</p>
      </Card>

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
              ? "Registre vacinas, consultas e pesagens. Depois o PetHub avisa antes de cada vencimento."
              : "Tente outro tipo de registro ou limpe o filtro."
          }
          action={
            petRecords.length === 0 ? (
              <ButtonLink href={`/pets/${pet.id}/health/new`}>
                Adicionar registro
              </ButtonLink>
            ) : (
              <button
                type="button"
                onClick={() => setFilter("todos")}
                className="min-h-11 rounded-full border border-line px-4 text-[0.9rem] font-medium text-ink"
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

      <p className="pt-2 text-meta text-muted">
        O PetHub organiza o que você registra. Ele não diagnostica nem substitui
        a avaliação de um veterinário.
      </p>
    </div>
  );
}
