"use client";

import { ArrowUpRight, ChevronRight, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Chip } from "@/components/ui/chip";
import { placeAttributeLabels, placeCategoryMeta } from "@/lib/domain/labels";
import type { CriterionScore, PlaceWithDistance } from "@/lib/domain/places";
import { placeCategoryIcons } from "@/lib/icons";

const visualThemes = {
  parque: { surface: "bg-lime-soft", rail: "border-l-teal" },
  restaurante: { surface: "bg-sun-soft", rail: "border-l-sun" },
  veterinario: { surface: "bg-blue-soft", rail: "border-l-blue" },
  banho_tosa: { surface: "bg-violet-soft", rail: "border-l-violet" },
  hospedagem: { surface: "bg-surface", rail: "border-l-teal" },
  passeador_adestrador: { surface: "bg-accent-soft", rail: "border-l-accent" },
} as const;

export function PlaceCard({
  place,
  topCriteria = [],
}: {
  place: PlaceWithDistance;
  topCriteria?: CriterionScore[];
}) {
  const Icon = placeCategoryIcons[place.category];
  const observedCriteria = topCriteria
    .filter((score) => score.positiveRatio >= 0.5)
    .slice(0, 2)
    .map((score) => score.attribute);
  const attributes =
    observedCriteria.length > 0
      ? observedCriteria
      : place.attributes
          .filter((attribute) => !placeAttributeLabels[attribute].negative)
          .slice(0, 2);
  const sourceLabel = place.seeded
    ? "Exemplo do catálogo"
    : "Adicionado neste aparelho";

  return (
    <Link
      href={`/explore/${place.id}`}
      aria-label={`Ver detalhes de ${place.name}, ${placeCategoryMeta[place.category].label}`}
      className="group flex min-h-[15.25rem] flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-[0_6px_20px_rgb(23_50_77/0.06)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-teal/35 hover:shadow-[0_12px_28px_rgb(23_50_77/0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 active:translate-y-0"
    >
      <div
        className={`relative flex h-28 items-end overflow-hidden border-l-[6px] ${visualThemes[place.category].surface} ${visualThemes[place.category].rail} p-4`}
        aria-hidden="true"
      >
        <span className="relative flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-teal-ink shadow-sm">
          <Icon className="size-6" />
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-white/75 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-ink-soft/80">
          {placeCategoryMeta[place.category].label}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[1.08rem] font-semibold leading-tight text-ink transition-colors group-hover:text-teal-ink">
              {place.name}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-meta text-muted">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              {place.neighborhood} · {place.distanceKm} km de distância estimada
            </p>
          </div>
          <ChevronRight
            aria-hidden="true"
            className="mt-1 size-5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-blue-deep"
          />
        </div>

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

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/70 pt-2.5">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[0.7rem] leading-4 text-muted">
            {place.seeded ? (
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
            <span className="truncate">
              {sourceLabel} · atualização não informada
            </span>
          </span>
          <span className="shrink-0 text-[0.72rem] font-semibold text-teal-ink">
            Detalhes
          </span>
        </div>
      </div>
    </Link>
  );
}
