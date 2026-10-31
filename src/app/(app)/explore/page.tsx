"use client";

import {
  Globe,
  Heart,
  List,
  LocateFixed,
  Map as MapIcon,
  Plus,
  Search,
  ShieldAlert,
  Siren,
  SlidersHorizontal,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DiscoveryTabs } from "@/components/discovery-tabs";
import { PlaceCard } from "@/components/place-card";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip, FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CheckboxRow,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { BottomSheet } from "@/components/ui/sheet";
import { SkeletonScreen } from "@/components/ui/skeleton";
import {
  criterionScores,
  emptyFilters,
  fetchNearbyOsmPlaces,
  filterPlaces,
  isEmergency24hPlace,
  reviewsForPlace,
  type PlaceFilters,
} from "@/lib/domain/places";
import { placeAttributeLabels, placeCategoryMeta } from "@/lib/domain/labels";
import { useOrigin } from "@/lib/geo";
import type { PlaceAttribute, PlaceCategory } from "@/lib/domain/schema";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

const PlaceMap = dynamic(
  () => import("@/components/place-map").then((mod) => mod.PlaceMap),
  {
    loading: () => (
      <div
        role="status"
        className="flex h-72 w-full items-center justify-center rounded-feature border border-line bg-surface/60 text-meta text-muted"
      >
        Carregando mapa local…
      </div>
    ),
  },
);

const CATEGORIES: PlaceCategory[] = [
  "veterinario",
  "farmacia",
  "pet_shop",
  "parque",
  "restaurante",
  "banho_tosa",
  "hospedagem",
  "passeador_adestrador",
];

const QUICK_ATTRIBUTES: PlaceAttribute[] = [
  "emergencia_24h",
  "equipe_paciente",
  "aceita_caes",
  "area_cercada",
  "agua_disponivel",
  "sombra",
  "area_externa",
  "aceita_raca_grande",
];

export default function ExplorePage() {
  const ready = useHydrated();
  const places = useAppStore((state) => state.places);
  const reviews = useAppStore((state) => state.reviews);
  const settings = useAppStore((state) => state.settings);
  const addPlace = useAppStore((state) => state.addPlace);
  const toggleFavoritePlace = useAppStore((state) => state.toggleFavoritePlace);
  const importOsmPlaces = useAppStore((state) => state.importOsmPlaces);
  const track = useAppStore((state) => state.track);

  const [filters, setFilters] = useState<PlaceFilters>(emptyFilters);
  const {
    origin,
    status: locationStatus,
    request: requestPreciseLocation,
  } = useOrigin();
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // "/explore?cadastrar=1" (from the first-aid screen) opens the form directly.
  // The page renders a skeleton until hydrated, so the sheet never hydrates.
  const [createOpen, setCreateOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("cadastrar"),
  );
  const [osmLoading, setOsmLoading] = useState(false);

  // Trusted place form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<PlaceCategory>("veterinario");
  const [newNeighborhood, setNewNeighborhood] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newOpeningHours, setNewOpeningHours] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newIs24h, setNewIs24h] = useState(false);
  const [newFavorite, setNewFavorite] = useState(true);

  const filtered = useMemo(
    () => filterPlaces(places, filters, origin),
    [places, filters, origin],
  );

  const emergencyCount = useMemo(
    () => places.filter((place) => isEmergency24hPlace(place)).length,
    [places],
  );
  const favoriteCount = useMemo(
    () => places.filter((place) => place.favorite).length,
    [places],
  );

  if (!ready) return <SkeletonScreen label="Carregando clínicas e locais" />;

  function toggleCategory(category: PlaceCategory) {
    setFilters((current) => {
      const next = current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category];
      track("explore_search", {
        category,
        active: !current.categories.includes(category),
      });
      return { ...current, categories: next };
    });
  }

  function toggleAttribute(attribute: PlaceAttribute) {
    setFilters((current) => {
      const next = current.attributes.includes(attribute)
        ? current.attributes.filter((item) => item !== attribute)
        : [...current.attributes, attribute];
      return { ...current, attributes: next };
    });
  }

  async function handleSearchOpenStreetMap() {
    setOsmLoading(true);
    try {
      const osmPlaces = await fetchNearbyOsmPlaces({
        origin,
        radiusMeters: 6000,
        city: settings.city,
      });
      if (osmPlaces.length === 0) {
        toast("Nenhum novo local retornado na região", {
          description:
            "Você pode cadastrar manualmente sua clínica ou farmácia de confiança.",
        });
        return;
      }
      const imported = await importOsmPlaces(osmPlaces);
      track("explore_search", { source: "osm", imported });
      toast.success(
        imported === 1
          ? "1 clínica real salva neste aparelho."
          : `${imported} clínicas reais salvas neste aparelho.`,
        {
          description:
            "Confirme horário e plantão por telefone antes de se deslocar.",
        },
      );
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Sem conexão com o mapa agora. Os locais salvos neste aparelho continuam disponíveis offline.",
      );
    } finally {
      setOsmLoading(false);
    }
  }

  async function handleCreateTrustedPlace(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim()) {
      toast.error("Informe o nome da clínica, farmácia ou local.");
      return;
    }
    try {
      const attrs: PlaceAttribute[] = [];
      if (newIs24h) attrs.push("emergencia_24h");
      if (newCategory === "veterinario" || newCategory === "farmacia") {
        attrs.push("equipe_paciente");
      }
      await addPlace({
        name: newName.trim(),
        category: newCategory,
        neighborhood: newNeighborhood.trim() || "Meu bairro",
        address: newAddress.trim() || "Endereço salvo pelo tutor",
        city: settings.city,
        lat: origin.lat,
        lng: origin.lng,
        attributes: attrs,
        priceLevel: null,
        verified: true,
        openNow: newIs24h ? true : null,
        phone: newPhone.trim() || null,
        whatsapp: newWhatsapp.trim() || newPhone.trim() || null,
        openingHours:
          newOpeningHours.trim() || (newIs24h ? "Plantão 24h" : null),
        notes: newNotes.trim() || null,
        favorite: newFavorite,
        source: "local",
      });
      toast.success("Local de confiança salvo neste aparelho!");
      setNewName("");
      setNewNeighborhood("");
      setNewAddress("");
      setNewPhone("");
      setNewWhatsapp("");
      setNewOpeningHours("");
      setNewNotes("");
      setNewIs24h(false);
      setNewFavorite(true);
      setCreateOpen(false);
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar o local.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 sm:flex-1 sm:basis-[18rem]">
          <h1 className="text-h1 font-bold tracking-tight text-ink">
            Descobrir
          </h1>
          <p className="mt-1.5 max-w-xl text-body text-ink-soft">
            Guarde veterinários, clínicas 24h, farmácias e pet shops de
            confiança para ligar rápido quando precisar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Cadastrar local
          </Button>
          <div className="inline-flex rounded-full border border-line bg-paper p-1">
            <button
              type="button"
              onClick={() => setView("lista")}
              aria-pressed={view === "lista"}
              className={`inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-label font-medium ${
                view === "lista" ? "bg-brand text-white" : "text-ink-soft"
              }`}
            >
              <List aria-hidden="true" className="size-4" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setView("mapa")}
              aria-pressed={view === "mapa"}
              className={`inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-label font-medium ${
                view === "mapa" ? "bg-brand text-white" : "text-ink-soft"
              }`}
            >
              <MapIcon aria-hidden="true" className="size-4" />
              Mapa
            </button>
          </div>
        </div>
      </div>

      <DiscoveryTabs active="locais" />

      <Card className="flex flex-col gap-3 border-danger/30 bg-danger-soft/50 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-card bg-danger-soft text-danger-ink">
            <ShieldAlert aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-body">
              Situação de urgência ou ingestão suspeita?
            </CardTitle>
            <p className="mt-0.5 text-meta leading-relaxed text-ink-soft">
              Consulte o guia offline de primeiros socorros e alimentos tóxicos
              (uva, xilitol, chocolate, remédios) ou filtre hospitais 24h
              abaixo.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          {emergencyCount > 0 ? (
            <Button
              size="sm"
              variant={filters.emergencyOnly ? "danger" : "secondary"}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  emergencyOnly: !current.emergencyOnly,
                }))
              }
            >
              <Siren aria-hidden="true" className="size-4" />
              {filters.emergencyOnly
                ? "Mostrando 24h"
                : `Suas clínicas 24h (${emergencyCount})`}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setNewCategory("veterinario");
                setNewIs24h(true);
                setCreateOpen(true);
              }}
            >
              <Siren aria-hidden="true" className="size-4" />
              Salvar clínica 24h
            </Button>
          )}
          <Link
            href="/first-aid"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-paper px-3.5 text-label font-semibold text-teal-ink transition-colors hover:border-teal/50"
          >
            Guia de primeiros socorros →
          </Link>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          selected={Boolean(filters.favoritesOnly)}
          onClick={() =>
            setFilters((current) => ({
              ...current,
              favoritesOnly: !current.favoritesOnly,
            }))
          }
        >
          <Heart aria-hidden="true" className="size-3.5" />
          Meus favoritos ({favoriteCount})
        </FilterChip>
        <button
          type="button"
          disabled={osmLoading}
          onClick={() => void handleSearchOpenStreetMap()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 py-1.5 text-label font-semibold text-ink-soft transition-colors hover:border-teal/50 hover:text-ink disabled:opacity-60"
        >
          <Globe aria-hidden="true" className="size-3.5 text-teal-ink" />
          {osmLoading
            ? "Buscando clínicas no mapa…"
            : "Buscar clínicas reais por perto"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            aria-label="Buscar clínica, farmácia, bairro ou telefone"
            placeholder="Clínica 24h, farmácia, bairro…"
            value={filters.query}
            onChange={(event) =>
              setFilters({ ...filters, query: event.target.value })
            }
            className="pl-10"
          />
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Mais filtros"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-card border border-line bg-paper px-3.5 text-label font-medium text-ink"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filtros
          {filters.attributes.length + (filters.verifiedOnly ? 1 : 0) > 0 ? (
            <Chip tone="teal">
              {filters.attributes.length + (filters.verifiedOnly ? 1 : 0)}
            </Chip>
          ) : null}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <FilterChip
          selected={filters.categories.length === 0}
          onClick={() => setFilters({ ...filters, categories: [] })}
        >
          Todos
        </FilterChip>
        {CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            selected={filters.categories.includes(category)}
            onClick={() => toggleCategory(category)}
          >
            {placeCategoryMeta[category].plural}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-meta text-muted">
        <span>
          {filtered.length}{" "}
          {filtered.length === 1 ? "lugar encontrado" : "lugares encontrados"}
        </span>
        <button
          type="button"
          onClick={requestPreciseLocation}
          className="inline-flex min-h-11 items-center gap-1 font-medium text-teal-ink"
        >
          <LocateFixed aria-hidden="true" className="size-3.5" />
          {locationStatus === "precisa"
            ? "Usando sua localização"
            : locationStatus === "carregando"
              ? "Buscando sua localização…"
              : locationStatus === "negado" || locationStatus === "indisponivel"
                ? "Tentar localização novamente"
                : "Usar minha localização"}
        </button>
      </div>

      {view === "mapa" ? (
        <PlaceMap
          places={filtered}
          origin={origin}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum lugar combina com esses filtros"
          description="Limpe os filtros, busque clínicas reais por perto ou cadastre seu veterinário de confiança."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setFilters(emptyFilters)}
              >
                Limpar filtros
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                Cadastrar local de confiança
              </Button>
            </div>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((place) => (
            <li key={place.id}>
              <PlaceCard
                place={place}
                topCriteria={criterionScores(
                  reviewsForPlace(reviews, place.id),
                )}
                onToggleFavorite={(id) => {
                  void toggleFavoritePlace(id).then((fav) => {
                    toast(
                      fav
                        ? "Adicionado aos locais de confiança"
                        : "Removido dos favoritos",
                    );
                  });
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtrar critérios"
        description="Combine critérios observáveis, plantão 24h e favoritos."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_ATTRIBUTES.map((attribute) => (
              <FilterChip
                key={attribute}
                selected={filters.attributes.includes(attribute)}
                onClick={() => toggleAttribute(attribute)}
              >
                {placeAttributeLabels[attribute].label}
              </FilterChip>
            ))}
          </div>
          <CheckboxRow
            checked={Boolean(filters.emergencyOnly)}
            onChange={(value) =>
              setFilters({ ...filters, emergencyOnly: value })
            }
            label="Apenas atendimento 24h / emergência"
            description="Filtra hospitais e clínicas com plantão 24h."
          />
          <CheckboxRow
            checked={Boolean(filters.favoritesOnly)}
            onChange={(value) =>
              setFilters({ ...filters, favoritesOnly: value })
            }
            label="Apenas meus favoritos de confiança"
            description="Mostra somente os locais que você marcou com coração."
          />
          <CheckboxRow
            checked={filters.verifiedOnly}
            onChange={(value) =>
              setFilters({ ...filters, verifiedOnly: value })
            }
            label="Apenas locais conferidos"
            description="Mostra só os locais que você cadastrou e conferiu."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setFilters(emptyFilters)}
            >
              Limpar
            </Button>
            <Button className="flex-1" onClick={() => setSheetOpen(false)}>
              Ver {filtered.length} lugares
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Cadastrar local de confiança"
        description="Guarde seu veterinário, hospital 24h, farmácia de manipulação ou pet shop neste aparelho com botões de ligação e WhatsApp."
      >
        <form
          onSubmit={(event) => void handleCreateTrustedPlace(event)}
          className="flex flex-col gap-3"
        >
          <Field htmlFor="place-name" label="Nome do local">
            <Input
              id="place-name"
              required
              maxLength={80}
              placeholder="Ex.: Hospital Veterinário 24h São Francisco"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
          </Field>
          <Field htmlFor="place-category" label="Categoria">
            <Select
              id="place-category"
              value={newCategory}
              onChange={(event) =>
                setNewCategory(event.target.value as PlaceCategory)
              }
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {placeCategoryMeta[category].label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field htmlFor="place-phone" label="Telefone (ligação direta)">
              <Input
                id="place-phone"
                type="tel"
                maxLength={40}
                placeholder="Ex.: (00) 0000-0000"
                value={newPhone}
                onChange={(event) => setNewPhone(event.target.value)}
              />
            </Field>
            <Field htmlFor="place-whatsapp" label="WhatsApp (opcional)">
              <Input
                id="place-whatsapp"
                type="tel"
                maxLength={40}
                placeholder="Ex.: (00) 00000-0000"
                value={newWhatsapp}
                onChange={(event) => setNewWhatsapp(event.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field htmlFor="place-neighborhood" label="Bairro">
              <Input
                id="place-neighborhood"
                maxLength={60}
                placeholder="Ex.: Pinheiros"
                value={newNeighborhood}
                onChange={(event) => setNewNeighborhood(event.target.value)}
              />
            </Field>
            <Field htmlFor="place-hours" label="Horário / Plantão">
              <Input
                id="place-hours"
                maxLength={160}
                placeholder="Ex.: Plantão 24h todos os dias"
                value={newOpeningHours}
                onChange={(event) => setNewOpeningHours(event.target.value)}
              />
            </Field>
          </div>
          <Field htmlFor="place-address" label="Endereço">
            <Input
              id="place-address"
              maxLength={160}
              placeholder="Ex.: Rua Teodoro Sampaio, 900"
              value={newAddress}
              onChange={(event) => setNewAddress(event.target.value)}
            />
          </Field>
          <Field
            htmlFor="place-notes"
            label="Observações (plantonista, convênio, referências)"
          >
            <Textarea
              id="place-notes"
              rows={2}
              maxLength={400}
              placeholder="Ex.: Dra. Helena atende felinos; estacionamento ao lado."
              value={newNotes}
              onChange={(event) => setNewNotes(event.target.value)}
            />
          </Field>
          <CheckboxRow
            checked={newIs24h}
            onChange={setNewIs24h}
            label="Atende emergência 24 horas"
            description="Destaca este local no filtro rápido de urgência."
          />
          <CheckboxRow
            checked={newFavorite}
            onChange={setNewFavorite}
            label="Marcar como favorito de confiança"
            description="Aparece no topo nas buscas de emergência."
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Salvar local
            </Button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
