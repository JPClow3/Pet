"use client";

import {
  Check,
  Compass,
  LocateFixed,
  Map,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DiscoveryTabs } from "@/components/discovery-tabs";
import { PageHeader } from "@/components/page-header";
import { PlaceCard } from "@/components/place-card";
import { PlaceMap } from "@/components/place-map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { BottomSheet } from "@/components/ui/sheet";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { placeAttributeLabels, placeCategoryMeta } from "@/lib/domain/labels";
import {
  criterionScores,
  emptyFilters,
  filterPlaces,
  reviewsForPlace,
  type PlaceFilters,
} from "@/lib/domain/places";
import type { PlaceAttribute, PlaceCategory } from "@/lib/domain/schema";
import { placeCategoryIcons } from "@/lib/icons";
import { useOrigin } from "@/lib/geo";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

const categories = Object.keys(placeCategoryMeta) as PlaceCategory[];
const attributeOptions = Object.keys(placeAttributeLabels) as PlaceAttribute[];

function ViewToggle({
  view,
  onChange,
}: {
  view: "lista" | "mapa";
  onChange: (next: "lista" | "mapa") => void;
}) {
  return (
    <div
      className="flex rounded-xl border border-line bg-white p-1"
      role="group"
      aria-label="Modo de visualização"
    >
      <button
        type="button"
        aria-pressed={view === "lista"}
        onClick={() => onChange("lista")}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[0.82rem] font-semibold transition-colors ${
          view === "lista"
            ? "bg-mint text-teal-ink"
            : "text-muted hover:bg-surface"
        }`}
      >
        <Compass aria-hidden="true" className="size-4" />
        Lista
      </button>
      <button
        type="button"
        aria-pressed={view === "mapa"}
        onClick={() => onChange("mapa")}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[0.82rem] font-semibold transition-colors ${
          view === "mapa"
            ? "bg-mint text-teal-ink"
            : "text-muted hover:bg-surface"
        }`}
      >
        <Map aria-hidden="true" className="size-4" />
        Mapa
      </button>
    </div>
  );
}

export default function ExplorePage() {
  const ready = useHydrated();
  const places = useAppStore((state) => state.places);
  const reviews = useAppStore((state) => state.reviews);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const track = useAppStore((state) => state.track);
  const { origin, status, request } = useOrigin();

  const [filters, setFilters] = useState<PlaceFilters>(emptyFilters);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState(settings.city);

  const results = useMemo(
    () => filterPlaces(places, { ...filters, query }, origin),
    [places, filters, query, origin],
  );

  const selectedFilterCount =
    filters.categories.length +
    filters.attributes.length +
    (filters.verifiedOnly ? 1 : 0);
  const locationLabel = settings.city || "sua cidade";

  function toggleCategory(category: PlaceCategory) {
    setFilters((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  }

  function toggleAttribute(attribute: PlaceAttribute) {
    setFilters((current) => ({
      ...current,
      attributes: current.attributes.includes(attribute)
        ? current.attributes.filter((item) => item !== attribute)
        : [...current.attributes, attribute],
    }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setQuery("");
  }

  if (!ready) return <SkeletonScreen label="Carregando lugares" />;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <PageHeader
        title="Descobrir"
        subtitle="Lugares que combinam com a rotina de vocês."
      />
      <DiscoveryTabs active="locais" />

      <section className="rounded-[20px] border border-line/80 bg-surface/60 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface-subtle text-teal-ink">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-teal-ink">
              Para começar
            </p>
            <h2 className="mt-1 text-[1.2rem] font-semibold leading-tight text-ink">
              Onde vocês querem ir?
            </h2>
            <p className="mt-1 max-w-[42ch] text-[0.9rem] leading-relaxed text-muted">
              Encontre um lugar por bairro e veja atributos que fazem diferença
              para o seu pet.
            </p>
          </div>
        </div>
      </section>

      <div className="sticky top-[3.5rem] z-10 -mx-4 border-b border-line/70 bg-white/95 px-4 pb-3 pt-1 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            track("explore_search", {
              query: query.trim(),
              results: results.length,
            });
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar nome ou bairro"
                aria-label="Buscar lugares por nome ou bairro"
                className="pl-10"
              />
            </div>
            <Button
              variant="secondary"
              size="icon"
              aria-label={
                selectedFilterCount > 0
                  ? `Abrir filtros, ${selectedFilterCount} ativos`
                  : "Abrir filtros"
              }
              onClick={() => setFiltersOpen(true)}
              className="relative"
            >
              <SlidersHorizontal aria-hidden="true" className="size-5" />
              {selectedFilterCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-teal-ink text-[0.68rem] font-bold text-white">
                  {selectedFilterCount}
                </span>
              ) : null}
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => request()}
              disabled={status === "carregando"}
              aria-pressed={settings.usePreciseLocation}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.82rem] font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                settings.usePreciseLocation
                  ? "border-teal-ink bg-teal-ink text-white"
                  : "border-line bg-white text-ink-soft hover:bg-mint"
              }`}
            >
              <LocateFixed aria-hidden="true" className="size-4" />
              {status === "carregando" ? "Localizando…" : "Perto de mim"}
            </button>
            <button
              type="button"
              onClick={() => {
                setLocationDraft(settings.city);
                setLocationOpen(true);
              }}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[0.82rem] font-semibold text-ink-soft transition-colors hover:bg-mint"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-accent"
              />
              {locationLabel}
            </button>
            {categories.map((category) => {
              const Icon = placeCategoryIcons[category];
              const selected = filters.categories.includes(category);
              return (
                <FilterChip
                  key={category}
                  selected={selected}
                  onClick={() => {
                    toggleCategory(category);
                    track("explore_search", { category });
                  }}
                  className="min-h-10"
                >
                  <Icon aria-hidden="true" className="size-3.5" />
                  {placeCategoryMeta[category].label}
                </FilterChip>
              );
            })}
          </div>
        </form>
      </div>

      {status === "negado" ? (
        <Card className="flex items-start gap-3 border-warning/40 bg-warning/10 p-4">
          <LocateFixed
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-warning-ink"
          />
          <div className="flex-1">
            <p className="text-[0.92rem] font-semibold text-ink">
              Localização não autorizada
            </p>
            <p className="mt-1 text-meta leading-relaxed text-muted">
              Continuamos mostrando o catálogo de {locationLabel}. Escolha um
              bairro ou tente liberar a localização do navegador.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setLocationOpen(true)}
              >
                Informar bairro
              </Button>
              <Button size="sm" variant="ghost" onClick={request}>
                Tentar de novo
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-muted">
            Explorar em {locationLabel}
          </p>
          <p className="mt-1 text-[0.9rem] text-ink-soft">
            {results.length} {results.length === 1 ? "resultado" : "resultados"}
          </p>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<Compass aria-hidden="true" className="size-5" />}
          title="Não encontramos locais com esses filtros"
          description="Remova um filtro ou busque por outro bairro. O catálogo continua salvo para consulta offline."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={clearFilters}>Limpar filtros</Button>
              <Button variant="secondary" onClick={() => setLocationOpen(true)}>
                Mudar região
              </Button>
            </div>
          }
        />
      ) : view === "mapa" ? (
        <PlaceMap places={results} origin={origin} />
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Locais encontrados">
          {results.map((place) => (
            <li key={place.id}>
              <PlaceCard
                place={place}
                topCriteria={criterionScores(
                  reviewsForPlace(reviews, place.id),
                )}
              />
            </li>
          ))}
        </ul>
      )}

      <Card className="border-teal/15 bg-surface/70 p-4">
        <div className="flex items-start gap-3">
          <Check
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-teal-ink"
          />
          <div className="text-meta leading-relaxed text-muted">
            <p className="font-semibold text-ink-soft">
              Atributos para decidir com mais segurança
            </p>
            <p className="mt-1">
              Área externa, sombra, água e porte aparecem separados das
              avaliações livres.
            </p>
            <p className="mt-1 text-[0.72rem]">
              Os locais desta prévia são exemplos do catálogo. Fonte,
              atualização e verificação atuais ainda não estão disponíveis.
            </p>
          </div>
        </div>
      </Card>

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtrar lugares"
        description="Combine os atributos que importam para o seu pet."
      >
        <div className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-[0.88rem] font-semibold text-ink">
              Categoria
            </legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <FilterChip
                  key={category}
                  selected={filters.categories.includes(category)}
                  onClick={() => toggleCategory(category)}
                >
                  {placeCategoryMeta[category].label}
                </FilterChip>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[0.88rem] font-semibold text-ink">
              Atributos que importam
            </legend>
            <p className="text-meta text-muted">
              Mostramos somente locais que têm todos os atributos escolhidos.
            </p>
            <div className="flex flex-wrap gap-2">
              {attributeOptions.map((attribute) => (
                <FilterChip
                  key={attribute}
                  selected={filters.attributes.includes(attribute)}
                  onClick={() => toggleAttribute(attribute)}
                >
                  {placeAttributeLabels[attribute].label}
                </FilterChip>
              ))}
            </div>
          </fieldset>

          <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface/50 px-3 py-3">
            <input
              type="checkbox"
              className="mt-0.5 size-5 accent-teal-ink"
              checked={filters.verifiedOnly}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  verifiedOnly: event.target.checked,
                }))
              }
            />
            <span>
              <span className="block text-[0.88rem] font-semibold text-ink">
                Com verificação cadastrada
              </span>
              <span className="mt-0.5 block text-meta text-muted">
                A verificação do catálogo pode estar desatualizada.
              </span>
            </span>
          </label>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Ver {results.length} {results.length === 1 ? "lugar" : "lugares"}
            </Button>
            <Button variant="secondary" onClick={clearFilters}>
              Limpar
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        title="Escolha uma região"
        description="Usaremos essa cidade ou bairro para orientar os resultados. Não é uma localização exata."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const next = locationDraft.trim();
            if (!next) return;
            updateSettings({ city: next, usePreciseLocation: false });
            setLocationOpen(false);
          }}
        >
          <Field label="Cidade ou bairro" htmlFor="explore-location">
            <Input
              id="explore-location"
              value={locationDraft}
              onChange={(event) => setLocationDraft(event.target.value)}
              placeholder="Ex.: Pinheiros, São Paulo"
              autoComplete="address-level2"
            />
          </Field>
          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={!locationDraft.trim()}
            >
              Usar esta região
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLocationOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
