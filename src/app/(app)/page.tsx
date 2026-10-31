"use client";

import {
  CalendarClock,
  Camera,
  ClipboardPlus,
  FileText,
  PawPrint,
  Scale,
  Siren,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BatchCareModal } from "@/components/batch-care-modal";
import { CareHalo, PetAvatar } from "@/components/pet-avatar";
import { HealthStatusCard } from "@/components/health-status-card";
import { PetContextSwitcher, type PetScope } from "@/components/pet-header";
import { PlaceCard } from "@/components/place-card";
import { ReminderCard } from "@/components/reminder-card";
import { Photo } from "@/components/ui/photo";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { formatShortDate, todayKey } from "@/lib/domain/dates";
import {
  filterPlaces,
  criterionScores,
  emptyFilters,
  reviewsForPlace,
} from "@/lib/domain/places";
import { activeReminders } from "@/lib/domain/reminders";
import { useOrigin } from "@/lib/geo";
import { useAppStore } from "@/lib/store/app-store";
import {
  useActivePet,
  useHydrated,
  usePetRecords,
  useReminderItems,
} from "@/lib/store/hooks";
import { cn } from "@/lib/utils";

function TodaySkeleton() {
  return (
    <div
      className="flex flex-col gap-5"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Abrindo a Zelupi</span>
      <div className="rounded-sheet border border-line bg-paper p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

function AllPetsHalo({
  pets,
  overdue,
  today,
}: {
  pets: ReturnType<typeof useAppStore.getState>["pets"];
  overdue: number;
  today: number;
}) {
  const attention = overdue + today;
  return (
    <div
      className="relative flex size-[6.75rem] shrink-0 items-center justify-center"
      aria-label="Resumo de atenção de todos os pets"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from -90deg, #E46F51 0deg ${attention > 0 ? 120 : 36}deg, #176B87 ${attention > 0 ? 120 : 36}deg ${attention > 1 ? 240 : 156}deg, #B6D8A8 ${attention > 1 ? 240 : 156}deg 360deg)`,
          mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))",
          WebkitMask:
            "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))",
        }}
      />
      <span className="relative flex size-[5.4rem] items-center justify-center rounded-full bg-canvas">
        <span className="flex -space-x-2">
          {pets.slice(0, 3).map((pet) => (
            <PetAvatar
              key={pet.id}
              pet={pet}
              size="sm"
              className="border-2 border-canvas"
            />
          ))}
        </span>
      </span>
    </div>
  );
}

function AttentionGroup({
  title,
  items,
  showPet,
  tone,
}: {
  title: string;
  items: ReturnType<typeof activeReminders>;
  showPet: boolean;
  tone: "danger" | "warning" | "info" | "muted";
}) {
  if (items.length === 0) return null;
  const toneClasses = {
    danger: "text-danger-ink",
    warning: "text-warning-ink",
    info: "text-info-ink",
    muted: "text-muted",
  } as const;
  return (
    <section aria-labelledby={`today-${tone}-title`}>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "text-meta font-semibold",
            toneClasses[tone],
          )}
        >
          {title}
        </span>
        <span className="h-px flex-1 bg-line/80" aria-hidden="true" />
        <span className="text-meta tabular-nums text-muted">
          {items.length}
        </span>
      </div>
      <h2 id={`today-${tone}-title`} className="sr-only">
        {title}
      </h2>
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

export default function HomePage() {
  const ready = useHydrated();
  const pets = useAppStore((state) => state.pets);
  const activePet = useActivePet();
  const activePetRecords = usePetRecords(activePet?.id ?? null);
  const reminderItems = useReminderItems();
  const diary = useAppStore((state) => state.diary);
  const records = useAppStore((state) => state.records);
  const places = useAppStore((state) => state.places);
  const reviews = useAppStore((state) => state.reviews);
  const { origin } = useOrigin();
  const [requestedScope, setScope] = useState<PetScope | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const scope = requestedScope ?? activePet?.id ?? "todos";

  const reminders = useMemo(
    () => activeReminders(reminderItems),
    [reminderItems],
  );
  const scopedReminders = useMemo(
    () =>
      scope === "todos"
        ? reminders
        : reminders.filter((item) => item.petId === scope),
    [reminders, scope],
  );
  const overdue = useMemo(
    () => scopedReminders.filter((item) => item.urgency === "vencido"),
    [scopedReminders],
  );
  const today = useMemo(
    () => scopedReminders.filter((item) => item.urgency === "hoje"),
    [scopedReminders],
  );
  const soon = useMemo(
    () => scopedReminders.filter((item) => item.urgency === "proximo"),
    [scopedReminders],
  );
  const later = useMemo(
    () => scopedReminders.filter((item) => item.urgency === "futuro"),
    [scopedReminders],
  );
  const petDiary = useMemo(
    () => diary.filter((entry) => entry.petId === activePet?.id).slice(0, 2),
    [diary, activePet?.id],
  );
  // Only places the tutor saved: demo catalogue entries never appear on Hoje.
  const savedPlaces = useMemo(
    () =>
      filterPlaces(
        places.filter((place) => !place.seeded),
        emptyFilters,
        origin,
      ).slice(0, 1),
    [places, origin],
  );
  const hasCareData = useMemo(
    () =>
      scope === "todos"
        ? records.length > 0 || reminders.length > 0
        : records.some((record) => record.petId === scope) ||
          scopedReminders.length > 0,
    [records, reminders, scope, scopedReminders],
  );

  if (!ready) return <TodaySkeleton />;

  if (pets.length === 0 || !activePet) {
    return (
      <EmptyState
        icon={<PawPrint aria-hidden="true" className="size-5" />}
        title="Comece pelo seu pet"
        description="Crie um perfil em menos de um minuto para receber lembretes, guardar o histórico e montar a carteirinha."
        action={<ButtonLink href="/pets/new">Criar perfil do pet</ButtonLink>}
      />
    );
  }

  const attentionCount = overdue.length + today.length;
  const nextItem = soon[0] ?? later[0] ?? null;
  // Three honest states: nothing recorded, nothing due, or something due.
  const headline = !hasCareData
    ? "Ainda sem cuidados registrados."
    : attentionCount > 0
      ? `${attentionCount} cuidado${attentionCount === 1 ? "" : "s"} pedindo atenção.`
      : nextItem
        ? `Nada pendente até ${formatShortDate(nextItem.dueDate)}.`
        : "Nada pendente na agenda.";
  const recordHref =
    scope === "todos" ? "/record/new" : `/pets/${activePet.id}/health/new`;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <section className="border-b border-line pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 sm:flex-1">
            <p className="text-meta text-muted">
              {formatShortDate(todayKey())}
            </p>
            <h1 className="mt-1 font-editorial text-h1 font-semibold leading-none tracking-tight text-ink">
              Hoje
            </h1>
            <div className="mt-3 max-w-full">
              <PetContextSwitcher
                scope={scope}
                allowAll
                onScopeChange={setScope}
                className="max-w-full"
              />
            </div>
            <p className="mt-4 max-w-[38ch] text-body font-semibold leading-relaxed text-ink">
              {headline}
            </p>
            {!hasCareData ? (
              <p className="mt-1 max-w-[42ch] text-label leading-relaxed text-ink-soft">
                Registre a vacina mais recente para a Zelupi avisar a próxima.
              </p>
            ) : null}
          </div>
          <div className="self-start sm:self-auto">
            {scope === "todos" ? (
              <AllPetsHalo
                pets={pets}
                overdue={overdue.length}
                today={today.length}
              />
            ) : (
              <CareHalo
                pet={activePet}
                records={activePetRecords}
                size="lg"
                label={`Agenda de cuidados de ${activePet.name}`}
              />
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-col sm:max-w-xs">
          <ButtonLink href={recordHref} variant="blue">
            <ClipboardPlus aria-hidden="true" className="size-4" />
            {hasCareData ? "Registrar cuidado" : "Registrar primeiro cuidado"}
          </ButtonLink>
        </div>
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.72fr)] lg:items-start">
        <section className="min-w-0" aria-labelledby="today-agenda-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="today-agenda-title"
              className="text-h2 font-semibold text-ink"
            >
              Sua agenda
            </h2>
            {scopedReminders.length > 0 ? (
              <Link
                href="/reminders"
                className="inline-flex min-h-11 items-center gap-1 text-meta font-bold text-teal-ink hover:text-teal-deep"
              >
                Abrir tudo
              </Link>
            ) : null}
          </div>

          {scopedReminders.length === 0 ? (
            <div className="flex items-start gap-3 rounded-card border border-dashed border-line bg-paper p-4">
              <CalendarClock
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-muted"
              />
              <p className="text-label leading-relaxed text-ink-soft">
                {hasCareData
                  ? "Nenhuma próxima data marcada. Ao registrar vacina, vermífugo ou antiparasitário, a próxima dose aparece aqui."
                  : "As próximas vacinas e remédios aparecem aqui depois do primeiro registro."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <AttentionGroup
                title="Atrasados"
                items={overdue}
                showPet={scope === "todos"}
                tone="danger"
              />
              <AttentionGroup
                title="Hoje"
                items={today}
                showPet={scope === "todos"}
                tone="warning"
              />
              <AttentionGroup
                title="Próximos"
                items={soon}
                showPet={scope === "todos"}
                tone="info"
              />
              <AttentionGroup
                title="Depois"
                items={later.slice(0, 3)}
                showPet={scope === "todos"}
                tone="muted"
              />
              {later.length > 3 ? (
                <Link
                  href="/reminders"
                  className="inline-flex min-h-11 items-center self-start text-meta font-bold text-teal-ink"
                >
                  Ver mais cuidados →
                </Link>
              ) : null}
            </div>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24">
          {/* With an empty agenda the status card would only repeat it. */}
          {activePetRecords.length > 0 && scopedReminders.length > 0 ? (
          <section aria-labelledby="today-context-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="today-context-title"
                className="text-h2 font-semibold text-ink"
              >
                Para {activePet.name}
              </h2>
              <Link
                href="/pets"
                className="inline-flex min-h-11 items-center text-meta font-bold text-teal-ink"
              >
                Perfil
              </Link>
            </div>
            <HealthStatusCard
              records={activePetRecords}
              href={`/pets/${activePet.id}/health`}
            />
          </section>
          ) : null}

          <section aria-labelledby="today-shortcuts-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="today-shortcuts-title"
                className="text-h3 font-semibold text-ink"
              >
                Ações rápidas
              </h2>
              <span className="text-meta text-muted">{activePet.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/first-aid"
                className="group flex min-h-24 flex-col justify-between rounded-card border border-danger/30 bg-paper p-3 text-label font-bold text-ink transition-colors hover:border-danger/60 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-ink focus-visible:ring-offset-2"
              >
                <Siren aria-hidden="true" className="size-5 text-danger-ink" />{" "}
                Emergência
              </Link>
              <Link
                href={`/pets/${activePet.id}/health/new?type=peso`}
                className="group flex min-h-24 flex-col justify-between rounded-card border border-line bg-paper p-3 text-label font-bold text-ink transition-colors hover:border-ink/25 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink focus-visible:ring-offset-2"
              >
                <Scale aria-hidden="true" className="size-5 text-muted" />{" "}
                Registrar peso
              </Link>
              <Link
                href={`/pets/${activePet.id}/diary`}
                className="group flex min-h-24 flex-col justify-between rounded-card border border-line bg-paper p-3 text-label font-bold text-ink transition-colors hover:border-ink/25 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink focus-visible:ring-offset-2"
              >
                <Camera aria-hidden="true" className="size-5 text-muted" />{" "}
                Guardar momento
              </Link>
              <Link
                href={`/pets/${activePet.id}/card`}
                className="group flex min-h-24 flex-col justify-between rounded-card border border-line bg-paper p-3 text-label font-bold text-ink transition-colors hover:border-ink/25 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink focus-visible:ring-offset-2"
              >
                <FileText
                  aria-hidden="true"
                  className="size-5 text-muted"
                />{" "}
                Abrir carteirinha
              </Link>
              {pets.length >= 2 ? (
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(true)}
                  className="group col-span-2 flex min-h-16 flex-row items-center justify-between rounded-card border border-teal-ink/30 bg-mint/35 p-3 text-left text-label font-bold text-ink transition-colors hover:border-teal/55 hover:bg-mint/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink focus-visible:ring-offset-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-full bg-white dark:bg-card">
                      <Users aria-hidden="true" className="size-5 text-teal-ink" />
                    </span>
                    <div>
                      <p className="leading-tight font-bold text-teal-deep">
                        Cuidado compartilhado
                      </p>
                      <p className="text-caption font-normal text-muted">
                        Passeio, alimentação, etc. para vários pets de uma vez
                      </p>
                    </div>
                  </div>
                  <span className="text-meta font-bold text-teal-ink">
                    Abrir →
                  </span>
                </button>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="today-diary-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="today-diary-title"
                className="text-h3 font-semibold text-ink"
              >
                Diário
              </h2>
              <Link
                href={`/pets/${activePet.id}/diary`}
                className="inline-flex min-h-11 items-center text-meta font-bold text-teal-ink"
              >
                Abrir diário
              </Link>
            </div>
            {petDiary.length === 0 ? (
              <p className="rounded-card border border-dashed border-line bg-paper p-4 text-label leading-relaxed text-ink-soft">
                Guarde uma foto ou uma linha sobre {activePet.name}. O diário é
                privado.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {petDiary.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 rounded-card border border-line bg-paper p-3"
                  >
                    {entry.photo ? (
                      <Photo
                        src={entry.photo}
                        alt=""
                        className="size-14 shrink-0 rounded-control"
                      />
                    ) : (
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-ink">
                        <Camera aria-hidden="true" className="size-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-label leading-relaxed text-ink-soft">
                        {entry.text}
                      </p>
                      <p className="mt-1 text-meta text-muted">
                        {formatShortDate(entry.date)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {savedPlaces.length > 0 ? (
        <section
          className="border-t border-line/80 pt-6"
          aria-labelledby="today-discover-title"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="today-discover-title"
              className="text-h3 font-semibold text-ink"
            >
              Seus locais de confiança
            </h2>
            <Link
              href="/explore"
              className="inline-flex min-h-11 items-center text-meta font-bold text-teal-ink"
            >
              Ver tudo
            </Link>
          </div>
          {savedPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              topCriteria={criterionScores(reviewsForPlace(reviews, place.id))}
            />
          ))}
        </section>
      ) : null}

      {activePet.lostMode.active ? (
        <Card className="border-danger/35 bg-danger-soft shadow-none">
          <div className="flex items-start gap-3">
            <Siren
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-danger-ink"
            />
            <div>
              <p className="font-bold text-danger-ink">
                Modo perdido ativo para {activePet.name}
              </p>
              <p className="mt-1 text-label leading-relaxed text-danger-ink/90">
                A carteirinha pública mostra o aviso e o contato que você
                escolheu.
              </p>
              <Link
                href={`/pets/${activePet.id}/card`}
                className="mt-2 inline-flex min-h-11 items-center text-meta font-bold text-danger-ink"
              >
                Ver carteirinha →
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      {pets.length >= 2 ? (
        <BatchCareModal
          open={batchModalOpen}
          onClose={() => setBatchModalOpen(false)}
          pets={pets}
        />
      ) : null}
    </div>
  );
}
