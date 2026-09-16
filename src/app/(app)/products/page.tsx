"use client";

import { Check, PackageOpen, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { ProductCard } from "@/components/product-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { recommendProducts } from "@/lib/domain/products";
import { useOrigin } from "@/lib/geo";
import { useAppStore } from "@/lib/store/app-store";
import { useActivePet, useHydrated } from "@/lib/store/hooks";

const categories = [
  { id: "todos", label: "Todos" },
  { id: "alimentacao", label: "Alimentação" },
  { id: "higiene", label: "Higiene" },
  { id: "passeio", label: "Passeio" },
  { id: "saude", label: "Saúde" },
  { id: "enriquecimento", label: "Enriquecimento" },
] as const;

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

export default function ProductsPage() {
  const ready = useHydrated();
  const pet = useActivePet();
  const products = useAppStore((state) => state.products);
  const places = useAppStore((state) => state.places);
  const track = useAppStore((state) => state.track);
  const { origin } = useOrigin();
  const [category, setCategory] =
    useState<(typeof categories)[number]["id"]>("todos");
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

  const recommendations = useMemo(
    () =>
      pet
        ? recommendProducts({ pet, products, places, origin, limit: 8 }).filter(
            (recommendation) =>
              category === "todos" ||
              recommendation.product.category === category,
          )
        : [],
    [pet, products, places, origin, category],
  );

  useEffect(() => {
    if (recommendations.length === 0) return;
    track("product_view", {
      count: recommendations.length,
      petId: pet?.id ?? "",
    });
  }, [recommendations.length, pet?.id, track]);

  if (!ready) return <SkeletonScreen label="Buscando recomendações" />;

  if (!pet) {
    return (
      <EmptyState
        icon={<PackageOpen aria-hidden="true" className="size-5" />}
        title="Crie o perfil do seu pet"
        description="As recomendações partem da espécie, porte, fase de vida e rotina dele."
        action={<ButtonLink href="/pets/new">Criar perfil</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <PageHeader
        title="Produtos"
        subtitle={`Sugestões explicadas para ${pet.name}.`}
      />
      <DiscoveryTabs active="produtos" />

      <section className="relative overflow-hidden rounded-[26px] border border-sun/45 bg-sun-soft p-5">
        <div className="relative flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sun text-ink shadow-[0_5px_12px_rgb(233_185_73/0.2)]">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-warning-ink">
              Recomendações transparentes
            </p>
            <h2 className="mt-1 text-[1.22rem] font-semibold leading-tight text-ink">
              Você escolhe com contexto.
            </h2>
            <p className="mt-1.5 max-w-[42ch] text-[0.9rem] leading-relaxed text-ink-soft/80">
              Cada item explica se combina com espécie, porte, fase de vida ou
              rotina de {pet.name}.
            </p>
          </div>
        </div>
      </section>

      {offline ? (
        <Card
          className="flex items-start gap-3 border-warning/40 bg-warning/10 p-4"
          role="status"
        >
          <SlidersHorizontal
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-warning-ink"
          />
          <div>
            <p className="text-[0.9rem] font-semibold text-ink">
              Você está sem conexão
            </p>
            <p className="mt-1 text-meta leading-relaxed text-muted">
              Estas sugestões estão salvas localmente. O parceiro externo só
              abre quando houver conexão.
            </p>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2 border-b border-line pb-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-muted">
            Filtrar por necessidade
          </p>
          <span className="text-meta text-muted">
            {recommendations.length} itens
          </span>
        </div>
        <div
          className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar"
          role="group"
          aria-label="Categoria de produto"
        >
          {categories.map((item) => (
            <FilterChip
              key={item.id}
              selected={category === item.id}
              onClick={() => setCategory(item.id)}
              className="min-h-10"
            >
              {item.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {recommendations.length === 0 ? (
        <EmptyState
          icon={<PackageOpen aria-hidden="true" className="size-5" />}
          title={
            category === "todos"
              ? "Nenhum produto compatível"
              : "Nenhum item nessa categoria"
          }
          description={
            category === "todos"
              ? "Complete o peso e a rotina de seu pet para receber sugestões mais úteis."
              : "Experimente outra categoria ou volte para todos os itens."
          }
          action={
            category === "todos" ? (
              <ButtonLink href={`/pets/${pet.id}/edit`}>
                Completar perfil
              </ButtonLink>
            ) : (
              <Button onClick={() => setCategory("todos")}>Ver todos</Button>
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-4" aria-label="Produtos recomendados">
          {recommendations.map((recommendation) => (
            <li key={recommendation.product.id}>
              <ProductCard recommendation={recommendation} />
            </li>
          ))}
        </ul>
      )}

      <Card className="border-blue/20 bg-blue-soft p-4">
        <div className="flex items-start gap-3">
          <Check
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-blue-deep"
          />
          <div className="text-meta leading-relaxed text-ink-soft/80">
            <p className="font-semibold text-ink">
              A transparência vem antes do clique.
            </p>
            <p className="mt-1">
              O PetHub não tem checkout, estoque ou promessa de entrega nesta
              prévia.
            </p>
            <p className="mt-1">
              Itens de saúde não substituem orientação de um médico-veterinário.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
