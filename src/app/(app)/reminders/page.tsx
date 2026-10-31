"use client";

import { BellRing, Check, ClipboardList, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { CareTabs } from "@/components/care-tabs";
import { PetContextSwitcher, type PetScope } from "@/components/pet-header";
import { ReminderCard } from "@/components/reminder-card";
import { ReminderForm } from "@/components/reminder-form";
import { BulkAddToCalendarButton } from "@/components/add-to-calendar";
import { createBulkCalendarEvents } from "@/lib/calendar";
import { Button, ButtonLink } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import {
  activeReminders,
  isSnoozed,
  reminderSummary,
} from "@/lib/domain/reminders";
import { formatDateTimeShort } from "@/lib/domain/dates";
import { latestMedicationDoseEvents } from "@/lib/domain/medication";
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
  const records = useAppStore((state) => state.records);
  // Opens on the active pet like the other care tabs; "Todos" is an explicit choice.
  const [requestedScope, setScope] = useState<PetScope | null>(null);
  const scope: PetScope =
    requestedScope ?? (pets.length > 1 ? (activePet?.id ?? "todos") : "todos");
  const [filter, setFilter] = useState<Filter>("todos");
  const [creating, setCreating] = useState(false);

  const completed = useMemo(
    () =>
      [
        ...reminders
          .filter((reminder) => reminder.done)
          .map((reminder) => ({
            key: `manual:${reminder.id}`,
            title: reminder.title,
            petId: reminder.petId,
            date: reminder.completedAt ?? null,
            href: null as string | null,
            reminderId: reminder.id as string | null,
          })),
        ...records
          .filter((record) => record.completedAt)
          .map((record) => ({
            key: `registro:${record.id}`,
            title: record.title,
            petId: record.petId,
            date: record.completedAt,
            href: `/pets/${record.petId}/health/${record.id}`,
            reminderId: null as string | null,
          })),
        ...records.flatMap((record) =>
          record.medication
            ? latestMedicationDoseEvents(record.medication)
                .filter((event) => event.status === "given")
                .map((event) => ({
                  key: `dose:${event.id}`,
                  title: `${record.title} · dose de ${event.date.split("-").reverse().join("/")} às ${event.time}`,
                  petId: record.petId,
                  date: event.recordedAt,
                  href: `/pets/${record.petId}/health/${record.id}`,
                  reminderId: null as string | null,
                }))
            : [],
        ),
      ]
        .filter((entry) => scope === "todos" || entry.petId === scope)
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [records, reminders, scope],
  );
  const scopedItems = useMemo(
    () =>
      scope === "todos" ? items : items.filter((item) => item.petId === scope),
    [items, scope],
  );
  const activeItems = useMemo(
    () => activeReminders(scopedItems),
    [scopedItems],
  );
  const summary = useMemo(() => reminderSummary(activeItems), [activeItems]);
  const filtered = useMemo(() => {
    if (filter === "concluidos") return [];
    if (filter === "vencidos")
      return activeItems.filter((item) => item.urgency === "vencido");
    if (filter === "hoje")
      return activeItems.filter((item) => item.urgency === "hoje");
    if (filter === "proximos")
      return activeItems.filter((item) => item.days >= 0 && item.days <= 7);
    return scopedItems;
  }, [filter, scopedItems, activeItems]);
  const awake = activeReminders(filtered);
  const snoozed = filtered.filter((item) => isSnoozed(item));
  const overdue = awake.filter((item) => item.urgency === "vencido");
  const today = awake.filter((item) => item.urgency === "hoje");
  const upcoming = awake.filter(
    (item) => item.urgency === "proximo" || item.urgency === "futuro",
  );

  const upcomingCalendarEvents = useMemo(() => {
    const scopedRecords =
      scope === "todos"
        ? records
        : records.filter((rec) => rec.petId === scope);
    const scopedReminders =
      scope === "todos"
        ? reminders
        : reminders.filter((rem) => rem.petId === scope);
    const scopedPets =
      scope === "todos"
        ? pets
        : pets.filter((pet) => pet.id === scope);

    return createBulkCalendarEvents({
      records: scopedRecords,
      reminders: scopedReminders,
      pets: scopedPets,
    });
  }, [records, reminders, pets, scope]);

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
          <h1 className="mt-1 font-editorial text-h1 font-semibold leading-none tracking-tight text-ink">
            Agenda
          </h1>
          <p className="mt-2 max-w-[48ch] text-body leading-relaxed text-muted">
            Um cuidado, uma chamada para ação. Datas e histórico ficam ligados
            ao pet certo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Criar lembrete
          </Button>
          <ButtonLink
            href={
              scope === "todos" ? "/record/new" : `/pets/${scope}/health/new`
            }
            size="sm"
          >
            <Plus aria-hidden="true" className="size-4" />
            Registrar cuidado
          </ButtonLink>
          <BulkAddToCalendarButton
            events={upcomingCalendarEvents}
            label="Adicionar à agenda do celular"
            size="sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <PetContextSwitcher scope={scope} allowAll onScopeChange={setScope} />
        {pets.length > 1 ? (
          <span className="text-meta text-muted">
            {scope === "todos" ? `${pets.length} pets` : activePet?.name}
          </span>
        ) : null}
      </div>

      <CareTabs
        active="agenda"
        pet={
          scope === "todos"
            ? activePet
            : (pets.find((pet) => pet.id === scope) ?? activePet)
        }
      />

      {summary.overdue + summary.today + summary.soon > 0 ? (
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
      ) : null}

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
          ? `${completed.length} cuidados concluídos`
          : `${filtered.length} cuidados neste filtro`}
      </p>

      {filter === "concluidos" ? (
        completed.length === 0 ? (
          <EmptyState
            icon={<Check aria-hidden="true" className="size-5" />}
            title="Nada concluído ainda"
            description="Quando você marcar um lembrete como feito, ele aparece aqui como histórico da agenda."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {completed.map((entry) => (
              <li key={entry.key}>
                <Card className="flex items-center gap-3 border-success-ink/25 bg-success-soft">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas text-success-ink">
                    <Check aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 text-body font-semibold text-ink">
                    {entry.href ? (
                      <Link
                        href={entry.href}
                        className="underline underline-offset-4"
                      >
                        {entry.title}
                      </Link>
                    ) : (
                      entry.title
                    )}
                    {entry.date ? (
                      <p className="mt-1 text-meta font-normal text-muted">
                        Concluído em {formatDateTimeShort(entry.date)}
                      </p>
                    ) : null}
                    {entry.reminderId ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={async () => {
                          try {
                            await useAppStore
                              .getState()
                              .updateReminder(entry.reminderId!, {
                                done: false,
                                completedAt: null,
                              });
                            toast.success("Lembrete reaberto na data original");
                          } catch (cause) {
                            toast.error(
                              cause instanceof Error
                                ? cause.message
                                : "Não foi possível reabrir.",
                            );
                          }
                        }}
                      >
                        Reabrir lembrete
                      </Button>
                    ) : null}
                  </div>
                  <span className="text-meta text-muted">
                    {pets.find((pet) => pet.id === entry.petId)?.name}
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
              ? "Nenhuma próxima data na agenda"
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
          {snoozed.length > 0 ? (
            <AgendaGroup
              title="Adiados"
              items={snoozed}
              showPet={scope === "todos"}
              tone="muted"
            />
          ) : null}
        </div>
      )}

      <Card className="border-line bg-surface/65 text-meta leading-relaxed text-muted">
        Avisos aparecem dentro da Zelupi a partir das datas que você registra. O
        app ainda não envia notificações com a tela fechada.
      </Card>
      <BottomSheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo lembrete"
        description="Organize a rotina do seu pet."
      >
        {creating ? (
          <ReminderForm
            pets={pets}
            petId={scope === "todos" ? activePet?.id : scope}
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              await useAppStore.getState().addReminder(values);
              setCreating(false);
              setFilter("todos");
              toast.success("Lembrete criado");
            }}
          />
        ) : null}
      </BottomSheet>
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
  tone: "danger" | "warning" | "info" | "muted";
}) {
  const toneClasses = {
    danger: "text-danger-ink",
    warning: "text-warning-ink",
    info: "text-info-ink",
    muted: "text-muted",
  } as const;
  return (
    <section aria-labelledby={`agenda-${tone}-title`}>
      <div className="mb-2 flex items-center gap-2">
        <h2
          id={`agenda-${tone}-title`}
          className={`text-meta font-bold uppercase tracking-[0.14em] ${toneClasses[tone]}`}
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
