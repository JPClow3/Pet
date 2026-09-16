"use client";

import { BellRing, Check, ClipboardList, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { CareTabs } from "@/components/care-tabs";
import { PetContextSwitcher, type PetScope } from "@/components/pet-header";
import { ReminderCard } from "@/components/reminder-card";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { reminderSummary } from "@/lib/domain/reminders";
import { useAppStore } from "@/lib/store/app-store";
import { useActivePet, useHydrated, useReminderItems } from "@/lib/store/hooks";

type Filter = "todos" | "vencidos" | "hoje" | "proximos" | "concluidos";

const filters: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "vencidos", label: "Atrasados" },
  { value: "hoje", label: "Hoje" },
  { value: "proximos", label: "Próximos 7 dias" },
  { value: "concluidos", label: "Concluídos" },
];

function AgendaSkeleton() {
  return (
    <div
      className="flex flex-col gap-5"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Carregando agenda</span>
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-12 w-full" />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export default function RemindersPage() {
  const ready = useHydrated();
  const items = useReminderItems();
  const activePet = useActivePet();
  const pets = useAppStore((state) => state.pets);
  const reminders = useAppStore((state) => state.reminders);
  const [scope, setScope] = useState<PetScope>("todos");
  const [filter, setFilter] = useState<Filter>("todos");

  const doneReminders = useMemo(
    () =>
      reminders.filter(
        (reminder) =>
          reminder.done && (scope === "todos" || reminder.petId === scope),
      ),
    [reminders, scope],
  );
  const scopedItems = useMemo(
    () =>
      scope === "todos" ? items : items.filter((item) => item.petId === scope),
    [items, scope],
  );
  const summary = useMemo(() => reminderSummary(scopedItems), [scopedItems]);
  const filtered = useMemo(() => {
    if (filter === "concluidos") return [];
    if (filter === "vencidos")
      return scopedItems.filter((item) => item.urgency === "vencido");
    if (filter === "hoje")
      return scopedItems.filter((item) => item.urgency === "hoje");
    if (filter === "proximos")
      return scopedItems.filter((item) => item.days >= 0 && item.days <= 7);
    return scopedItems;
  }, [filter, scopedItems]);
  const overdue = filtered.filter((item) => item.urgency === "vencido");
  const today = filtered.filter((item) => item.urgency === "hoje");
  const upcoming = filtered.filter(
    (item) => item.urgency === "proximo" || item.urgency === "futuro",
  );

  if (!ready) return <AgendaSkeleton />;

  if (pets.length === 0) {
    return (
      <EmptyState
        icon={<BellRing aria-hidden="true" className="size-5" />}
        title="A agenda começa com um pet"
        description="Crie um perfil para registrar cuidados e acompanhar próximas datas."
        action={<ButtonLink href="/pets/new">Criar perfil do pet</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-meta font-bold uppercase tracking-[0.14em] text-muted">
            Cuidados
          </p>
          <h1 className="mt-1 font-editorial text-[2.25rem] font-semibold leading-none tracking-tight text-ink">
            Agenda
          </h1>
          <p className="mt-2 max-w-[48ch] text-[0.92rem] leading-relaxed text-muted">
            Um cuidado, uma chamada para ação. Datas e histórico ficam ligados
            ao pet certo.
          </p>
        </div>
        <ButtonLink
          href={scope === "todos" ? "/record/new" : `/pets/${scope}/health/new`}
          size="sm"
        >
          <Plus aria-hidden="true" className="size-4" />
          Registrar cuidado
        </ButtonLink>
      </div>

      <div className="flex items-center justify-between gap-3">
        <PetContextSwitcher scope={scope} allowAll onScopeChange={setScope} />
        <span className="text-meta text-muted">
          {scope === "todos"
            ? `${pets.length} ${pets.length === 1 ? "pet" : "pets"}`
            : activePet?.name}
        </span>
      </div>

      <CareTabs
        active="agenda"
        pet={
          scope === "todos"
            ? activePet
            : (pets.find((pet) => pet.id === scope) ?? activePet)
        }
      />

      <div className="grid grid-cols-3 gap-2" aria-label="Resumo da agenda">
        <Card className="border-accent/25 bg-accent-soft/65 p-3 sm:p-4">
          <span className="block text-2xl font-bold tabular-nums text-accent-ink">
            {summary.overdue}
          </span>
          <span className="text-meta font-semibold text-accent-ink">
            Atrasados
          </span>
        </Card>
        <Card className="border-warning/35 bg-warning-soft/70 p-3 sm:p-4">
          <span className="block text-2xl font-bold tabular-nums text-warning-ink">
            {summary.today}
          </span>
          <span className="text-meta font-semibold text-warning-ink">Hoje</span>
        </Card>
        <Card className="border-info-ink/25 bg-info-soft/75 p-3 sm:p-4">
          <span className="block text-2xl font-bold tabular-nums text-info-ink">
            {summary.soon}
          </span>
          <span className="text-meta font-semibold text-info-ink">
            Próximos
          </span>
        </Card>
      </div>

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar"
        aria-label="Filtrar agenda"
      >
        {filters.map((option) => (
          <FilterChip
            key={option.value}
            selected={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {filter === "concluidos"
          ? `${doneReminders.length} cuidados concluídos`
          : `${filtered.length} cuidados neste filtro`}
      </p>

      {filter === "concluidos" ? (
        doneReminders.length === 0 ? (
          <EmptyState
            icon={<Check aria-hidden="true" className="size-5" />}
            title="Nada concluído ainda"
            description="Quando você marcar um lembrete como feito, ele aparece aqui como histórico da agenda."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {doneReminders.map((reminder) => (
              <li key={reminder.id}>
                <Card className="flex items-center gap-3 border-success-ink/25 bg-success-soft">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas text-success-ink">
                    <Check aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-[0.95rem] font-semibold text-ink">
                    {reminder.title}
                  </span>
                  <span className="text-meta text-muted">
                    {reminder.petId === activePet?.id
                      ? activePet.name
                      : pets.find((pet) => pet.id === reminder.petId)?.name}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList aria-hidden="true" className="size-5" />}
          title={
            filter === "todos"
              ? "Tudo organizado por enquanto"
              : "Nada neste filtro"
          }
          description={
            filter === "todos"
              ? "Registre um cuidado com próxima data para ele aparecer aqui."
              : "Mude o filtro ou registre uma nova data para este pet."
          }
          action={
            <ButtonLink
              href={
                scope === "todos" ? "/record/new" : `/pets/${scope}/health/new`
              }
            >
              Adicionar cuidado
            </ButtonLink>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {overdue.length > 0 ? (
            <AgendaGroup
              title="Atrasados"
              items={overdue}
              showPet={scope === "todos"}
              tone="danger"
            />
          ) : null}
          {today.length > 0 ? (
            <AgendaGroup
              title="Hoje"
              items={today}
              showPet={scope === "todos"}
              tone="warning"
            />
          ) : null}
          {upcoming.length > 0 ? (
            <AgendaGroup
              title="Próximos"
              items={upcoming}
              showPet={scope === "todos"}
              tone="info"
            />
          ) : null}
        </div>
      )}

      <Card className="border-line bg-surface/65 text-[0.82rem] leading-relaxed text-muted">
        Avisos aparecem dentro do PetHub a partir das datas que você registra. A
        entrega de notificações do sistema depende do suporte da instalação e da
        permissão do aparelho.
      </Card>
    </div>
  );
}

function AgendaGroup({
  title,
  items,
  showPet,
  tone,
}: {
  title: string;
  items: ReturnType<typeof useReminderItems>;
  showPet: boolean;
  tone: "danger" | "warning" | "info";
}) {
  const toneClasses = {
    danger: "text-danger-ink",
    warning: "text-warning-ink",
    info: "text-info-ink",
  } as const;
  return (
    <section aria-labelledby={`agenda-${tone}-title`}>
      <div className="mb-2 flex items-center gap-2">
        <h2
          id={`agenda-${tone}-title`}
          className={`text-[0.78rem] font-bold uppercase tracking-[0.14em] ${toneClasses[tone]}`}
        >
          {title}
        </h2>
        <span className="h-px flex-1 bg-line/80" aria-hidden="true" />
        <span className="text-meta tabular-nums text-muted">
          {items.length}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.key}>
            <ReminderCard item={item} showPet={showPet} />
          </li>
        ))}
      </ul>
    </section>
  );
}
