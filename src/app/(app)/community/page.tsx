"use client";

import {
  ArrowUpRight,
  MapPin,
  MessageCircle,
  Plus,
  Radio,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { SkeletonScreen } from "@/components/ui/skeleton";
import {
  emptyFeedFilters,
  filterPosts,
  visiblePosts,
} from "@/lib/domain/community";
import { postTypeMeta } from "@/lib/domain/labels";
import type { PostType } from "@/lib/domain/schema";
import { useAppStore, MY_AUTHOR } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

const types = Object.keys(postTypeMeta) as PostType[];

function DiscoveryTabs({
  active,
}: {
  active: "locais" | "comunidade" | "produtos";
}) {
  const tabs = [
    {
      id: "locais" as const,
      label: "Locais",
      href: "/explore",
      hint: "Encontrar lugares",
    },
    {
      id: "comunidade" as const,
      label: "Comunidade",
      href: "/community",
      hint: "Trocar experiências",
    },
    {
      id: "produtos" as const,
      label: "Produtos",
      href: "/products",
      hint: "Ver parceiros",
    },
  ];

  return (
    <nav
      aria-label="Seções de Descobrir"
      className="flex overflow-x-auto rounded-2xl border border-line bg-surface/70 p-1 no-scrollbar"
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 text-center transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 ${
              selected
                ? "bg-white text-teal-ink shadow-[0_2px_8px_rgb(23_50_77/0.08)]"
                : "text-muted hover:bg-white/70 hover:text-ink"
            }`}
          >
            <span className="text-[0.82rem] font-semibold">{tab.label}</span>
            <span className="hidden text-[0.65rem] leading-4 opacity-80 sm:block">
              {tab.hint}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

type FeedMode = "para_voce" | "perto" | "seguindo";

export default function CommunityPage() {
  const ready = useHydrated();
  const posts = useAppStore((state) => state.posts);
  const comments = useAppStore((state) => state.comments);
  const groups = useAppStore((state) => state.groups);
  const memberGroupIds = useAppStore((state) => state.memberGroupIds);
  const blocked = useAppStore((state) => state.blockedAuthorIds);
  const settings = useAppStore((state) => state.settings);

  const [typesFilter, setTypesFilter] = useState<PostType[]>([]);
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [mode, setMode] = useState<FeedMode>("para_voce");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const updateConnection = () => setOffline(!navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const myGroups = useMemo(
    () => groups.filter((group) => memberGroupIds.includes(group.id)),
    [groups, memberGroupIds],
  );

  const feed = useMemo(() => {
    const visible = visiblePosts(posts, blocked);
    const scoped =
      mode === "perto"
        ? visible.filter((post) => post.city && post.city === settings.city)
        : mode === "seguindo"
          ? visible.filter(
              (post) =>
                post.authorId === MY_AUTHOR ||
                (post.groupId && memberGroupIds.includes(post.groupId)),
            )
          : visible;
    return filterPosts(
      scoped,
      { ...emptyFeedFilters, types: typesFilter, query, onlyMine, groupId },
      MY_AUTHOR,
    );
  }, [
    posts,
    blocked,
    mode,
    settings.city,
    memberGroupIds,
    typesFilter,
    query,
    onlyMine,
    groupId,
  ]);

  function clearFeedFilters() {
    setTypesFilter([]);
    setQuery("");
    setOnlyMine(false);
    setGroupId(null);
  }

  if (!ready) return <SkeletonScreen label="Carregando a comunidade" />;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <PageHeader
        title="Comunidade"
        subtitle="Experiências de tutores, com contexto para ajudar."
        action={
          <ButtonLink href="/community/new" size="sm">
            <Plus aria-hidden="true" className="size-4" />
            Publicar
          </ButtonLink>
        }
      />

      <DiscoveryTabs active="comunidade" />

      <section className="relative overflow-hidden rounded-[26px] border border-blue/30 bg-blue-soft p-5">
        <div className="relative flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue text-white shadow-[0_5px_12px_rgb(52_87_213/0.2)]">
            <Radio aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-blue-deep">
              Prévia da comunidade
            </p>
            <h2 className="mt-1 text-[1.22rem] font-semibold leading-tight text-ink">
              Troque o que você aprendeu.
            </h2>
            <p className="mt-1.5 max-w-[42ch] text-[0.9rem] leading-relaxed text-ink-soft/80">
              Perguntas, recomendações e encontros aparecem por tema. Pessoas e
              horários desta tela são exemplos locais.
            </p>
          </div>
        </div>
      </section>

      {offline ? (
        <Card
          className="flex items-start gap-3 border-warning/40 bg-warning/10 p-4"
          role="status"
        >
          <Radio
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-warning-ink"
          />
          <div>
            <p className="text-[0.9rem] font-semibold text-ink">
              Você está sem conexão
            </p>
            <p className="mt-1 text-meta leading-relaxed text-muted">
              A prévia salva continua disponível. Publicações reais precisam de
              conexão e moderação ativa.
            </p>
          </div>
        </Card>
      ) : null}

      <div
        className="flex gap-2 overflow-x-auto border-b border-line pb-1 no-scrollbar"
        role="tablist"
        aria-label="Filtrar comunidade"
      >
        {[
          { id: "para_voce" as const, label: "Para você", icon: MessageCircle },
          { id: "perto" as const, label: "Perto", icon: MapPin },
          { id: "seguindo" as const, label: "Seguindo", icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          const selected = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setMode(item.id)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[0.88rem] font-semibold transition-colors ${selected ? "border-blue text-blue-deep" : "border-transparent text-muted hover:text-ink"}`}
            >
              <Icon aria-hidden="true" className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar uma conversa"
            aria-label="Buscar publicações"
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          <FilterChip
            selected={onlyMine}
            onClick={() => {
              setOnlyMine((current) => !current);
              setGroupId(null);
            }}
            className="min-h-10"
          >
            Minhas publicações
          </FilterChip>
          {types.map((type) => (
            <FilterChip
              key={type}
              selected={typesFilter.includes(type)}
              onClick={() =>
                setTypesFilter((current) =>
                  current.includes(type)
                    ? current.filter((item) => item !== type)
                    : [...current, type],
                )
              }
              className="min-h-10"
            >
              {postTypeMeta[type].label}
            </FilterChip>
          ))}
        </div>
      </div>

      <section className="border-l-4 border-l-accent bg-accent-soft px-4 py-3">
        <div className="flex items-start gap-3">
          <ShieldAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-accent-deep"
          />
          <p className="text-meta leading-relaxed text-ink-soft/85">
            Experiências da comunidade não são orientação veterinária. Em caso
            de dúvida ou sintomas, procure um médico-veterinário.
          </p>
        </div>
      </section>

      {mode === "perto" && feed.length === 0 ? (
        <EmptyState
          icon={<MapPin aria-hidden="true" className="size-5" />}
          title="Ainda há pouca atividade nesta região"
          description={`Não encontramos publicações marcadas como ${settings.city}. Você pode explorar grupos por interesse.`}
          action={
            <ButtonLink href="/community/groups">
              Ver grupos por interesse
            </ButtonLink>
          }
        />
      ) : feed.length === 0 ? (
        <EmptyState
          icon={<MessageCircle aria-hidden="true" className="size-5" />}
          title="Nada por aqui com esses filtros"
          description={
            onlyMine
              ? "Você ainda não publicou. Comece com uma pergunta ou recomendação."
              : "Tente limpar a busca ou escolher outro tipo de conversa."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={clearFeedFilters}>Limpar filtros</Button>
              <ButtonLink href="/community/new" variant="secondary">
                Criar publicação
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <ul
          className="flex flex-col gap-3"
          aria-label="Publicações da comunidade"
        >
          {feed.map((post) => (
            <li key={post.id}>
              <PostCard
                post={post}
                comments={
                  comments.filter(
                    (comment) =>
                      comment.postId === post.id && !comment.reported,
                  ).length
                }
              />
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-3 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted">
              Encontrar seu contexto
            </p>
            <h2 className="mt-1 text-[1.05rem] font-semibold text-ink">
              Grupos por interesse
            </h2>
          </div>
          <Link
            href="/community/groups"
            className="inline-flex min-h-10 items-center gap-1 text-[0.82rem] font-semibold text-blue-deep"
          >
            Ver todos
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(myGroups.length > 0 ? myGroups : groups)
            .slice(0, 3)
            .map((group) => (
              <button
                key={group.id}
                type="button"
                aria-pressed={groupId === group.id}
                onClick={() => {
                  setGroupId(groupId === group.id ? null : group.id);
                  setOnlyMine(false);
                }}
                className={`min-w-[12rem] shrink-0 border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 ${groupId === group.id ? "border-blue bg-blue-soft" : "border-line bg-surface hover:bg-white"}`}
              >
                <p className="line-clamp-1 text-[0.88rem] font-semibold text-ink">
                  {group.name}
                </p>
                <p className="mt-1 text-meta text-muted">
                  {group.members.toLocaleString("pt-BR")} participantes
                </p>
              </button>
            ))}
        </div>
      </section>

      <p className="text-[0.72rem] leading-relaxed text-muted">
        Esta é uma prévia local. Pessoas, grupos e atividade exibidos como
        exemplo não representam usuários conectados em tempo real.
      </p>
    </div>
  );
}
