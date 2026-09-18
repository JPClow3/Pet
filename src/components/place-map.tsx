"use client";

import { ChevronRight, LocateFixed, MapPin } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Chip } from "@/components/ui/chip";
import { placeAttributeLabels, placeCategoryMeta } from "@/lib/domain/labels";
import type { Coordinates, PlaceWithDistance } from "@/lib/domain/places";

export function PlaceMap({
  places,
  origin,
  className,
}: {
  places: PlaceWithDistance[];
  origin: Coordinates;
  className?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    places[0]?.id ?? null,
  );

  const bounds = useMemo(() => {
    const points = [
      ...places.map((place) => ({ lat: place.lat, lng: place.lng })),
      origin,
    ];
    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    const pad = 0.02;
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
    };
  }, [places, origin]);

  const project = (point: Coordinates) => ({
    x:
      ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) *
      100,
    y:
      (1 - (point.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) *
      100,
  });

  const selected =
    places.find((place) => place.id === selectedId) ?? places[0] ?? null;
  const originPoint = project(origin);

  return (
    <div className={className}>
      <section
        className="overflow-hidden rounded-[24px] border border-line/80 bg-surface-subtle shadow-none"
        aria-label="Mapa esquemático dos locais encontrados"
      >
        <div className="relative h-72 overflow-hidden bg-lime-soft/40">
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {Array.from({ length: 11 }).map((_, index) => (
              <g key={index} stroke="#cfe2dc" strokeWidth="0.24">
                <line x1={index * 10} y1="0" x2={index * 10} y2="100" />
                <line x1="0" y1={index * 10} x2="100" y2={index * 10} />
              </g>
            ))}
            <path
              d="M-5 76 C20 58 23 75 45 54 S78 30 106 36"
              fill="none"
              stroke="#c2d9ce"
              strokeWidth="2.2"
              opacity="0.75"
            />
            <path
              d="M-4 25 C24 41 31 18 51 34 S81 70 105 57"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              opacity="0.8"
            />
          </svg>

          <div
            className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink/10"
            style={{ left: `${originPoint.x}%`, top: `${originPoint.y}%` }}
            aria-hidden="true"
          >
            <span className="flex size-3 items-center justify-center rounded-full border-2 border-white bg-ink shadow-sm" />
          </div>

          {places.map((place) => {
            const point = project(place);
            const active = place.id === selected?.id;
            return (
              <button
                key={place.id}
                type="button"
                aria-pressed={active}
                aria-label={`${place.name}, ${placeCategoryMeta[place.category].label}, ${place.distanceKm} km de distância estimada`}
                onClick={() => setSelectedId(place.id)}
                className={`absolute flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-transform duration-200 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 ${active ? "scale-110" : "hover:scale-105"}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                <span
                  className={`flex items-center justify-center rounded-full border-2 border-white shadow-sm ${active ? "size-8 bg-ink text-white" : "size-6 bg-teal text-white"}`}
                >
                  <MapPin
                    aria-hidden="true"
                    className={active ? "size-4" : "size-3.5"}
                  />
                </span>
              </button>
            );
          })}

          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[0.7rem] font-semibold text-ink-soft shadow-sm backdrop-blur-sm">
            <LocateFixed
              aria-hidden="true"
              className="size-3.5 text-teal-ink"
            />
            Você está aqui (estimado)
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-white px-4 py-3">
          <p className="text-meta text-muted">
            Mapa esquemático · {places.length} locais
          </p>
          <p className="text-[0.68rem] font-semibold text-warning-ink">
            Dados do catálogo
          </p>
        </div>
      </section>

      <p className="mt-2 text-meta leading-relaxed text-muted">
        Os pins ajudam a comparar distâncias. A lista abaixo é a referência
        completa e continua acessível sem o mapa.
      </p>

      <div className="mt-3 flex flex-col gap-2" aria-label="Locais do mapa">
        {places.map((place) => {
          const active = place.id === selected?.id;
          return (
            <button
              key={place.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedId(place.id)}
              className={`flex min-h-12 items-center gap-3 rounded-2xl border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink focus-visible:ring-offset-2 ${active ? "border-teal/40 bg-mint/70" : "border-line bg-white hover:bg-surface"}`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-mint text-teal-ink">
                <MapPin aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.88rem] font-semibold text-ink">
                  {place.name}
                </span>
                <span className="block truncate text-meta text-muted">
                  {placeCategoryMeta[place.category].label} · {place.distanceKm}{" "}
                  km estimados
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted"
              />
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="mt-3 rounded-[20px] border border-line/80 bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[1rem] font-semibold text-ink">
                {selected.name}
              </p>
              <p className="mt-1 text-meta text-muted">
                {selected.address} · {selected.distanceKm} km de distância
                estimada
              </p>
            </div>
            <span className="rounded-full bg-warning/15 px-2.5 py-1 text-[0.68rem] font-semibold text-warning-ink">
              Catálogo
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selected.attributes.slice(0, 3).map((attribute) => (
              <Chip key={attribute} tone="mint">
                {placeAttributeLabels[attribute].label}
              </Chip>
            ))}
          </div>
          <Link
            href={`/explore/${selected.id}`}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-teal-ink px-4 text-[0.9rem] font-semibold text-white transition-colors hover:bg-teal-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink focus-visible:ring-offset-2"
          >
            Ver detalhes e avaliações
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
