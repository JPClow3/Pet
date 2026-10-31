"use client";

import {
  ArrowUpRight,
  ChevronRight,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Siren,
} from "lucide-react";
import Link from "next/link";

import { Chip } from "@/components/ui/chip";
import { placeAttributeLabels, placeCategoryMeta } from "@/lib/domain/labels";
import {
  formatKm,
  isEmergency24hPlace,
  placeContactLinks,
  type CriterionScore,
  type PlaceWithDistance,
} from "@/lib/domain/places";
import { placeCategoryIcons } from "@/lib/icons";

export const placeVisualThemes = {
  parque: { surface: "bg-lime-soft", rail: "border-l-teal" },
  restaurante: { surface: "bg-sun-soft", rail: "border-l-sun" },
  veterinario: { surface: "bg-blue-soft", rail: "border-l-blue" },
  farmacia: { surface: "bg-mint", rail: "border-l-teal" },
  pet_shop: { surface: "bg-accent-soft", rail: "border-l-accent" },
  banho_tosa: { surface: "bg-violet-soft", rail: "border-l-violet" },
  hospedagem: { surface: "bg-surface", rail: "border-l-teal" },
  passeador_adestrador: { surface: "bg-accent-soft", rail: "border-l-accent" },
} as const;

export function PlaceCard({
  place,
  topCriteria = [],
  onToggleFavorite,
}: {
  place: PlaceWithDistance;
  topCriteria?: CriterionScore[];
  onToggleFavorite?: (placeId: string) => void;
}) {
  const Icon = placeCategoryIcons[place.category];
  const is24h = isEmergency24hPlace(place);
  const { callHref, waHref } = placeContactLinks(
    place,
    `Olá! Vi o contato de ${place.name} na Zelupi e gostaria de atendimento veterinário.`,
  );

  const observedCriteria = topCriteria
    .filter((score) => score.positiveRatio >= 0.5)
    .slice(0, 2)
    .map((score) => score.attribute);
  const attributes = (
    observedCriteria.length > 0
      ? observedCriteria
      : place.attributes
          .filter((attribute) => !placeAttributeLabels[attribute].negative)
          .slice(0, 2)
  ).filter((attribute) => !place.seeded || attribute !== "emergencia_24h");

  const sourceLabel =
    place.source === "osm"
      ? "Mapa colaborativo · confirme por telefone"
      : place.seeded
        ? "Exemplo fictício · sem contato"
        : "Local de confiança neste aparelho";

  const theme = placeVisualThemes[place.category];

  return (
    <article className="group flex min-h-[15.25rem] flex-col overflow-hidden rounded-feature border border-line/80 bg-paper shadow-none transition-[border-color,background-color] duration-150 hover:border-teal/50">
      <div
        className={`relative flex min-h-24 items-end justify-between gap-2 overflow-hidden border-l-[6px] ${theme.surface} ${theme.rail} p-4`}
      >
        <span
          aria-hidden="true"
          className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl border border-line/60 bg-paper/95 text-teal-ink shadow-sm"
        >
          <Icon className="size-6" />
        </span>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {is24h ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-caption font-bold uppercase tracking-[0.06em] text-danger-ink">
              <Siren aria-hidden="true" className="size-3.5" />
              24h
            </span>
          ) : null}
          <span className="rounded-full bg-paper/85 px-2.5 py-1 text-caption font-bold uppercase tracking-[0.08em] text-ink-soft">
            {placeCategoryMeta[place.category].label}
          </span>
          {onToggleFavorite ? (
            <button
              type="button"
              aria-label={
                place.favorite
                  ? `Remover ${place.name} dos favoritos de confiança`
                  : `Salvar ${place.name} nos favoritos de confiança`
              }
              aria-pressed={Boolean(place.favorite)}
              onClick={() => onToggleFavorite(place.id)}
              className={`inline-flex size-11 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink ${
                place.favorite
                  ? "border-danger-ink/30 bg-danger-soft text-danger-ink"
                  : "border-line/70 bg-paper/90 text-muted hover:text-ink"
              }`}
            >
              <Heart
                aria-hidden="true"
                className={`size-4 ${place.favorite ? "fill-current" : ""}`}
              />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <Link
          href={`/explore/${place.id}`}
          aria-label={`Ver detalhes de ${place.name}, ${placeCategoryMeta[place.category].label}`}
          className="group/link flex items-start gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-h3 font-semibold leading-tight text-ink transition-colors group-hover/link:text-teal-ink">
                {place.name}
              </h3>
              {place.seeded ? (
                <Chip tone="warning" className="px-2 py-0.5 text-caption">
                  Exemplo
                </Chip>
              ) : place.favorite ? (
                <Chip tone="teal" className="px-2 py-0.5 text-caption">
                  Confiança
                </Chip>
              ) : null}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-meta text-muted">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              <span>
                {place.neighborhood} · {formatKm(place.distanceKm)} de
                distância estimada
              </span>
            </p>
            {place.openingHours ? (
              <p className="mt-0.5 text-meta font-medium text-ink-soft">
                {place.openingHours}
              </p>
            ) : null}
          </div>
          <ChevronRight
            aria-hidden="true"
            className="mt-1 size-5 shrink-0 text-muted transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:text-blue-deep"
          />
        </Link>

        <div className="flex flex-wrap gap-1.5">
          {attributes.map((attribute) => (
            <Chip key={attribute} tone="mint">
              {placeAttributeLabels[attribute].label}
            </Chip>
          ))}
          {place.priceLevel !== null && place.priceLevel > 0 ? (
            <Chip tone="muted">{"$".repeat(place.priceLevel)}</Chip>
          ) : null}
        </div>

        {(callHref || waHref) ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {callHref ? (
              <a
                href={callHref}
                aria-label={`Ligar para ${place.name}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-meta font-semibold text-ink transition-colors hover:border-teal/50 hover:bg-paper"
              >
                <Phone aria-hidden="true" className="size-3.5 text-teal-ink" />
                <span>Ligar</span>
              </a>
            ) : null}
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Conversar no WhatsApp com ${place.name}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-success-ink/30 bg-success-soft px-3 py-1.5 text-meta font-semibold text-success-ink transition-colors hover:border-success-ink/60"
              >
                <MessageCircle aria-hidden="true" className="size-3.5" />
                <span>WhatsApp</span>
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2.5">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-caption leading-4 text-muted">
            {place.source === "osm" ? (
              <Globe
                aria-hidden="true"
                className="size-3.5 shrink-0 text-info-ink"
              />
            ) : place.seeded ? (
              <ArrowUpRight
                aria-hidden="true"
                className="size-3.5 shrink-0 text-warning-ink"
              />
            ) : (
              <ShieldCheck
                aria-hidden="true"
                className="size-3.5 shrink-0 text-teal-ink"
              />
            )}
            <span className="truncate">{sourceLabel}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
