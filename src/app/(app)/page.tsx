"use client";

import {
  ArrowUpRight,
  Camera,
  Check,
  ClipboardPlus,
  FileText,
  PawPrint,
  Scale,
  Siren,
  Syringe,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CareHalo, PetAvatar } from "@/components/pet-avatar";
import { HealthStatusCard } from "@/components/health-status-card";
import { PetContextSwitcher, type PetScope } from "@/components/pet-header";
import { PlaceCard } from "@/components/place-card";
import { PostCard } from "@/components/post-card";
import { ReminderCard } from "@/components/reminder-card";
import { Photo } from "@/components/ui/photo";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { commentsForPost, visiblePosts } from "@/lib/domain/community";
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
      <span className="sr-only">Abrindo seu PetHub</span>
      <div className="rounded-[28px] border border-line bg-white p-5">
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
            "text-[0.78rem] font-bold uppercase tracking-[0.14em]",
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
  const places = useAppStore((state) => state.places);
  const reviews = useAppStore((state) => state.reviews);
  const posts = useAppStore((state) => state.posts);
  const comments = useAppStore((state) => state.comments);
  const blocked = useAppStore((state) => state.blockedAuthorIds);
  const { origin } = useOrigin();
  const [requestedScope, setScope] = useState<PetScope | null>(null);
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
  const nearPlaces = useMemo(
    () => filterPlaces(places, emptyFilters, origin).slice(0, 1),
    [places, origin],
  );
  const feed = useMemo(
    () => visiblePosts(posts, blocked).slice(0, 1),
    [posts, blocked],
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
  const headline =
    scope === "todos"
      ? attentionCount === 0
        ? "Tudo organizado por hoje."
        : `${attentionCount} cuidado${attentionCount === 1 ? "" : "s"} pedindo atenção.`
      : today.length === 0 && overdue.length === 0
        ? `${activePet.name} está sem cuidados para resolver agora.`
        : `${activePet.name} tem ${attentionCount} cuidado${attentionCount === 1 ? "" : "s"} para acompanhar.`;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <section className="rounded-[24px] border border-blue/20 bg-blue-soft/55 p-5 shadow-none sm:p-7">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 sm:flex-1">
            <p className="text-meta font-bold uppercase tracking-[0.14em] text-blue-deep">
              {formatShortDate(todayKey())}
            </p>
            <h1 className="mt-1 font-editorial text-[2.25rem] font-semibold leading-none tracking-tight text-ink">
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
            <p className="mt-4 max-w-[38ch] text-[1rem] font-semibold leading-relaxed text-ink">
              {headline}
            </p>
            <p className="mt-1 max-w-[42ch] text-[0.88rem] leading-relaxed text-ink-soft">
              {scope === "todos"
                ? "A agenda mostra cada cuidado com o nome do pet para você agir sem trocar de contexto."
                : `A agenda de ${activePet.name} aparece aqui, com histórico preservado.`}
            </p>
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
        <div className="relative mt-5 flex flex-col gap-2 sm:max-w-md sm:flex-row">
          <ButtonLink
            href={
              scope === "todos"
                ? "/record/new"
                : `/pets/${activePet.id}/health/new`
            }
            size="sm"
            variant="blue"
          >
            <ClipboardPlus aria-hidden="true" className="size-4" />
            Registrar cuidado
          </ButtonLink>
          <ButtonLink
            href={scope === "todos" ? "/pets" : `/pets/${activePet.id}/card`}
            size="sm"
            variant="secondary"
          >
            <FileText aria-hidden="true" className="size-4" />
            {scope === "todos" ? "Ver pets" : "Carteirinha"}
          </ButtonLink>
        </div>
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.72fr)] lg:items-start">
        <section className="min-w-0" aria-labelledby="today-agenda-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-meta font-bold uppercase tracking-[0.14em] text-muted">
                Próximo passo
              </p>
              <h2
                id="today-agenda-title"
                className="mt-1 font-editorial text-[1.7rem] font-semibold leading-tight text-ink"
              >
                Sua agenda
              </h2>
            </div>
            <Link
              href="/reminders"
              className="inline-flex min-h-11 items-center gap-1 text-meta font-bold text-teal-ink hover:text-teal-deep"
            >
              Abrir tudo <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          {scopedReminders.length === 0 ? (
            <Card className="border-success-ink/30 bg-success-soft shadow-none">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-canvas text-success-ink">
                  <Check aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h3 className="text-[1rem] font-bold text-ink">
                    Tudo organizado por hoje
                  </h3>
                  <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-soft">
                    Registre o próximo cuidado quando quiser ou veja o histórico
                    para conferir a história completa.
                  </p>
                  <Link
                    href={
                      scope === "todos"
                        ? "/reminders"
                        : `/pets/${activePet.id}/health`
                    }
                    className="mt-3 inline-flex min-h-11 items-center text-meta font-bold text-success-ink"
                  >
                    Ver próximos cuidados →
                  </Link>
                </div>
              </div>
            </Card>
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
          <section aria-labelledby="today-context-title">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-meta font-bold uppercase tracking-[0.14em] text-muted">
                  Contexto
                </p>
                <h2
                  id="today-context-title"
                  className="mt-1 font-editorial text-[1.5rem] font-semibold leading-tight text-ink"
                >
                  Para {activePet.name}
                </h2>
              </div>
              <Link href="/pets" className="text-meta font-bold text-teal-ink">
                Perfil
              </Link>
            </div>
            <HealthStatusCard
              records={activePetRecords}
              href={`/pets/${activePet.id}/health`}
            />
          </section>

          <section aria-labelledby="today-shortcuts-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="today-shortcuts-title"
                className="font-editorial text-[1.35rem] font-semibold text-ink"
              >
                Ações rápidas
              </h2>
              <span className="text-meta text-muted">{activePet.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/pets/${activePet.id}/health/new`}
                className="group flex min-h-24 flex-col justify-between rounded-[18px] border border-line bg-white p-3 text-[0.88rem] font-bold text-ink transition-colors hover:border-teal/45 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink focus-visible:ring-offset-2"
              >
                <Syringe aria-hidden="true" className="size-5 text-teal-ink" />{" "}
                Registrar cuidado
              </Link>
              <Link
                href={`/pets/${activePet.id}/health/new?type=peso`}
                className="group flex min-h-24 flex-col justify-between rounded-[18px] border border-line bg-white p-3 text-[0.88rem] font-bold text-ink transition-colors hover:border-blue/45 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-deep focus-visible:ring-offset-2"
              >
                <Scale aria-hidden="true" className="size-5 text-blue-deep" />{" "}
                Registrar peso
              </Link>
              <Link
                href={`/pets/${activePet.id}/diary`}
                className="group flex min-h-24 flex-col justify-between rounded-[18px] border border-line bg-white p-3 text-[0.88rem] font-bold text-ink transition-colors hover:border-accent/45 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <Camera aria-hidden="true" className="size-5 text-accent-ink" />{" "}
                Guardar momento
              </Link>
              <Link
                href={`/pets/${activePet.id}/card`}
                className="group flex min-h-24 flex-col justify-between rounded-[18px] border border-line bg-white p-3 text-[0.88rem] font-bold text-ink transition-colors hover:border-warning/55 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-ink focus-visible:ring-offset-2"
              >
                <FileText
                  aria-hidden="true"
                  className="size-5 text-warning-ink"
                />{" "}
                Abrir carteirinha
              </Link>
            </div>
          </section>

          <section aria-labelledby="today-diary-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="today-diary-title"
                className="font-editorial text-[1.35rem] font-semibold text-ink"
              >
                Diário
              </h2>
              <Link
                href={`/pets/${activePet.id}/diary`}
                className="text-meta font-bold text-teal-ink"
              >
                Abrir diário
              </Link>
            </div>
            {petDiary.length === 0 ? (
              <Card className="border-accent-ink/25 bg-accent-soft/55 shadow-none">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-canvas text-accent-ink">
                    <Camera aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-[0.95rem] font-bold text-ink">
                      A história de {activePet.name} começa aqui
                    </h3>
                    <p className="mt-1 text-[0.86rem] leading-relaxed text-ink-soft">
                      Guarde uma foto ou uma linha. O diário é privado por
                      padrão.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <ul className="flex flex-col gap-2">
                {petDiary.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3"
                  >
                    {entry.photo ? (
                      <Photo
                        src={entry.photo}
                        alt=""
                        className="size-14 shrink-0 rounded-[14px]"
                      />
                    ) : (
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink">
                        <Camera aria-hidden="true" className="size-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[0.88rem] leading-relaxed text-ink-soft">
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

      <section
        className="border-t border-line/80 pt-6"
        aria-labelledby="today-discover-title"
      >
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-meta font-bold uppercase tracking-[0.14em] text-muted">
              Depois do cuidado
            </p>
            <h2
              id="today-discover-title"
              className="mt-1 font-editorial text-[1.5rem] font-semibold text-ink"
            >
              Descobrir
            </h2>
          </div>
          <Link href="/explore" className="text-meta font-bold text-teal-ink">
            Ver tudo
          </Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {nearPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              topCriteria={criterionScores(reviewsForPlace(reviews, place.id))}
            />
          ))}
          {feed.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              comments={commentsForPost(comments, post.id).length}
            />
          ))}
        </div>
        {nearPlaces.length === 0 && feed.length === 0 ? (
          <p className="rounded-[18px] border border-dashed border-line bg-surface/60 p-4 text-[0.9rem] text-muted">
            Locais e comunidade aparecem aqui quando houver conteúdo disponível.
          </p>
        ) : null}
      </section>

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
              <p className="mt-1 text-[0.88rem] leading-relaxed text-danger-ink/90">
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
    </div>
  );
}
