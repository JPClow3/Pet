"use client";

import { Check, PackageOpen, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DiscoveryTabs } from "@/components/discovery-tabs";
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
    void track("product_view", {
      count: recommendations.length,
      petId: pet?.id ?? "",
    }).catch(() => {});
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
        subtitle={`Catálogo de demonstração para ${pet.name}.`}
      />
      <DiscoveryTabs active="produtos" />

      <section className="rounded-card border border-line bg-paper p-4">
        <h2 className="text-body font-semibold text-ink">
          Exemplos de recomendações
        </h2>
        <p className="mt-1 max-w-[56ch] text-label leading-relaxed text-muted">
          As sugestões consideram espécie, porte, fase de vida e rotina de{" "}
          {pet.name}. Produtos e preços são fictícios; não há compras.
        </p>
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
            <p className="text-label font-semibold text-ink">
              Você está sem conexão
            </p>
            <p className="mt-1 text-meta leading-relaxed text-muted">
              O catálogo de demonstração continua disponível neste aparelho.
            </p>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2 border-b border-line pb-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption font-semibold text-muted">
            Filtrar por necessidade
          </p>
          <span className="text-meta text-muted">
            {recommendations.length} itens
          </span>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Categoria de produto"
        >
          {categories.map((item) => (
            <FilterChip
              key={item.id}
              selected={category === item.id}
              onClick={() => setCategory(item.id)}
              className="min-h-11"
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

      <Card className="border-line/80 bg-surface-subtle p-4">
        <div className="flex items-start gap-3">
          <Check
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-teal-ink"
          />
          <div className="text-meta leading-relaxed text-muted">
            <p className="font-semibold text-ink">
              A transparência vem antes do clique.
            </p>
            <p className="mt-1">
              A Zelupi não tem checkout, estoque ou promessa de entrega nesta
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
