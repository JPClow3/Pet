"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

const kindLabels: Record<string, string> = {
  especie: "Espécie",
  raca: "Raça",
  cidade: "Cidade",
  interesse: "Interesse",
  atividade: "Atividade",
};

function DiscoveryTabs() {
  return (
    <nav
      aria-label="Seções de Descobrir"
      className="flex overflow-x-auto rounded-2xl border border-line bg-surface/70 p-1 no-scrollbar"
    >
      {[
        { label: "Locais", href: "/explore" },
        { label: "Comunidade", href: "/community", active: true },
        { label: "Produtos", href: "/products" },
      ].map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl px-1 text-[0.82rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 ${tab.active ? "bg-white text-blue-deep shadow-[0_2px_8px_rgb(23_50_77/0.08)]" : "text-muted hover:bg-white/70 hover:text-ink"}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export default function GroupsPage() {
  const ready = useHydrated();
  const groups = useAppStore((state) => state.groups);
  const memberGroupIds = useAppStore((state) => state.memberGroupIds);
  const joinGroup = useAppStore((state) => state.joinGroup);
  const leaveGroup = useAppStore((state) => state.leaveGroup);
  const settings = useAppStore((state) => state.settings);

  const grouped = useMemo(() => {
    const byKind = new Map<string, typeof groups>();
    for (const group of groups) {
      byKind.set(group.kind, [...(byKind.get(group.kind) ?? []), group]);
    }
    return [...byKind.entries()];
  }, [groups]);

  if (!ready) return <SkeletonScreen label="Carregando grupos" />;

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title="Grupos"
        subtitle="Conversas organizadas por contexto."
        backHref="/community"
      />

      <DiscoveryTabs />

      <section className="border-l-4 border-l-blue bg-blue-soft px-4 py-3">
        <p className="text-meta leading-relaxed text-ink-soft/85">
          Grupos nesta prévia organizam conversas por contexto. A atividade
          exibida é demonstrativa e não representa usuários conectados em tempo
          real.
        </p>
      </section>

      {groups.length === 0 ? (
        <EmptyState
          icon={<Users aria-hidden="true" className="size-5" />}
          title="Nenhum grupo disponível"
          description="Os grupos aparecem quando a comunidade da sua cidade é ativada."
          action={<ButtonLink href="/community">Voltar ao feed</ButtonLink>}
        />
      ) : (
        grouped.map(([kind, items]) => (
          <section key={kind} className="flex flex-col gap-2">
            <h2 className="text-[1.05rem] font-semibold text-ink">
              {kindLabels[kind]}
            </h2>
            <ul className="flex flex-col gap-2">
              {items.map((group) => {
                const isMember = memberGroupIds.includes(group.id);
                return (
                  <li key={group.id}>
                    <Card className="flex flex-col gap-3 rounded-[20px] border-l-4 border-l-blue bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-[1rem] font-semibold text-ink">
                            {group.name}
                          </h3>
                          <p className="text-meta text-muted">
                            {group.members.toLocaleString("pt-BR")}{" "}
                            participantes
                            {group.city ? ` · ${group.city}` : ""}
                          </p>
                        </div>
                        <Chip tone={isMember ? "teal" : "muted"}>
                          {isMember ? "Participando" : "Sugerido"}
                        </Chip>
                      </div>
                      <p className="text-[0.9rem] text-ink-soft/90">
                        {group.description}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (isMember) {
                            leaveGroup(group.id);
                          } else {
                            joinGroup(group.id);
                          }
                        }}
                        className={`min-h-11 self-start rounded-full px-4 text-[0.9rem] font-medium ${
                          isMember
                            ? "border border-line text-ink hover:bg-surface"
                            : "bg-blue text-white"
                        }`}
                      >
                        {isMember ? "Sair do grupo" : "Entrar no grupo"}
                      </button>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <Card className="border-sun/30 bg-sun-soft text-meta text-ink-soft/80">
        Grupos por cidade mostram conteúdo de {settings.city}. Você pode
        silenciar um grupo sem sair dele.
      </Card>
    </div>
  );
}
