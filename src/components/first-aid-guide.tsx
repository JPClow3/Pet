"use client";

import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  MessageCircle,
  Phone,
  Search,
  ShieldAlert,
  Siren,
  WifiOff,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Card, CardTitle } from "@/components/ui/card";
import { Chip, FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import {
  foodRiskMeta,
  foodSpeciesLabels,
  searchFirstAidGuides,
  searchFoodSafetyItems,
  type FoodRiskLevel,
  type FoodSpeciesScope,
} from "@/lib/domain/first-aid";
import {
  isEmergency24hPlace,
  phoneCallUrl,
  whatsappUrl,
} from "@/lib/domain/places";
import type { Pet, Place } from "@/lib/domain/schema";

const QUICK_PANIC_TERMS = [
  "Uva",
  "Xilitol",
  "Cebola",
  "Chocolate",
  "Paracetamol",
  "Lírio",
  "Dipirona",
  "Osso cozido",
  "Engasgo",
  "Convulsão",
];

export function FirstAidGuide({
  activePet = null,
  places = [],
}: {
  activePet?: Pet | null;
  places?: Place[];
}) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<"todos" | "alimentos" | "socorros">(
    "todos",
  );
  const [speciesFilter, setSpeciesFilter] = useState<
    FoodSpeciesScope | "todos"
  >(
    activePet?.species === "cao" || activePet?.species === "gato"
      ? activePet.species
      : "todos",
  );
  const [riskFilter, setRiskFilter] = useState<FoodRiskLevel | "todos">(
    "todos",
  );

  const matchedFoods = useMemo(
    () =>
      searchFoodSafetyItems(query, {
        species: speciesFilter,
        risk: riskFilter,
      }),
    [query, speciesFilter, riskFilter],
  );

  const matchedGuides = useMemo(() => searchFirstAidGuides(query), [query]);

  const primaryEmergencyContact = useMemo(() => {
    if (activePet?.emergencyVet?.phone) {
      return {
        name:
          activePet.emergencyVet.clinicName ||
          activePet.emergencyVet.name ||
          "Veterinário de emergência",
        phone: activePet.emergencyVet.phone,
        whatsapp: activePet.emergencyVet.phone,
        badge: `Emergência de ${activePet.name}`,
      };
    }
    const favorite24h = places.find(
      (place) =>
        place.favorite && isEmergency24hPlace(place) && Boolean(place.phone),
    );
    if (favorite24h) {
      return {
        name: favorite24h.name,
        phone: favorite24h.phone ?? null,
        whatsapp: favorite24h.whatsapp ?? favorite24h.phone ?? null,
        badge: "Clínica 24h favorita",
      };
    }
    const any24h = places.find(
      (place) => isEmergency24hPlace(place) && Boolean(place.phone),
    );
    if (any24h) {
      return {
        name: any24h.name,
        phone: any24h.phone ?? null,
        whatsapp: any24h.whatsapp ?? any24h.phone ?? null,
        badge: any24h.seeded ? "Clínica 24h (exemplo)" : "Clínica 24h",
      };
    }
    return null;
  }, [activePet, places]);

  const callHref = phoneCallUrl(primaryEmergencyContact?.phone);
  const waHref = whatsappUrl(
    primaryEmergencyContact?.whatsapp,
    `Olá! Preciso de atendimento veterinário de urgência${activePet ? ` para ${activePet.name}` : ""}.`,
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 border-danger/35 bg-danger-soft/50 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-danger-soft text-danger-ink">
              <Siren aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-[1.05rem]">
                  Pronto-socorro e consulta rápida offline
                </CardTitle>
                <Chip tone="teal" className="px-2 py-0.5 text-[0.68rem]">
                  <WifiOff aria-hidden="true" className="size-3" />
                  100% Offline
                </Chip>
              </div>
              <p className="mt-1 text-meta leading-relaxed text-ink-soft">
                Orientações imediatas de estabilização e alimentos tóxicos. Não
                substitui atendimento veterinário presencial.
              </p>
            </div>
          </div>
          <Link
            href="/explore"
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-line bg-paper px-3.5 text-[0.82rem] font-semibold text-teal-ink transition-colors hover:border-teal/50"
          >
            Ver clínicas 24h próximas →
          </Link>
        </div>

        {primaryEmergencyContact ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line/80 bg-paper p-3">
            <div className="min-w-0">
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-danger-ink">
                {primaryEmergencyContact.badge}
              </span>
              <p className="truncate text-[0.92rem] font-semibold text-ink">
                {primaryEmergencyContact.name}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {callHref ? (
                <a
                  href={callHref}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-danger-ink px-3.5 py-1.5 text-[0.8rem] font-semibold text-white transition-opacity hover:opacity-95"
                >
                  <Phone aria-hidden="true" className="size-3.5" />
                  Ligar agora ({primaryEmergencyContact.phone})
                </a>
              ) : null}
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-success-ink/35 bg-success-soft px-3.5 py-1.5 text-[0.8rem] font-semibold text-success-ink"
                >
                  <MessageCircle aria-hidden="true" className="size-3.5" />
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      <div className="flex flex-col gap-2.5">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            aria-label="Buscar alimento, substância ou emergência"
            placeholder="Ex.: Cachorro pode comer uva? Xilitol? Cebola? Engasgo?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.75rem] font-semibold text-muted">
            Busca rápida:
          </span>
          {QUICK_PANIC_TERMS.map((term) => {
            const active = query.toLowerCase() === term.toLowerCase();
            return (
              <button
                key={term}
                type="button"
                aria-pressed={active}
                onClick={() => setQuery(active ? "" : term)}
                className={`rounded-full border px-2.5 py-1 text-[0.76rem] font-semibold transition-colors ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-paper text-ink-soft hover:border-teal/50"
                }`}
              >
                {term}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        <FilterChip
          selected={section === "todos"}
          onClick={() => setSection("todos")}
        >
          Tudo ({matchedFoods.length + matchedGuides.length})
        </FilterChip>
        <FilterChip
          selected={section === "alimentos"}
          onClick={() => setSection("alimentos")}
        >
          Alimentos e substâncias ({matchedFoods.length})
        </FilterChip>
        <FilterChip
          selected={section === "socorros"}
          onClick={() => setSection("socorros")}
        >
          Primeiros socorros ({matchedGuides.length})
        </FilterChip>
      </div>

      {section !== "socorros" ? (
        <section
          aria-labelledby="heading-toxic-foods"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="heading-toxic-foods"
                className="font-editorial text-xl font-semibold text-ink"
              >
                Alimentos, plantas e medicamentos
              </h2>
              <p className="text-meta text-muted">
                Verifique em segundos o que é letal, tóxico ou seguro para cães
                e gatos.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "todos", label: "Cães e gatos" },
                  { id: "cao", label: "Cães" },
                  { id: "gato", label: "Gatos" },
                ] as const
              ).map((item) => (
                <FilterChip
                  key={item.id}
                  selected={speciesFilter === item.id}
                  onClick={() => setSpeciesFilter(item.id)}
                >
                  {item.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "todos", label: "Todos os níveis" },
                { id: "letal", label: "Emergência / Letal" },
                { id: "toxico", label: "Tóxico" },
                { id: "atencao", label: "Atenção" },
                { id: "seguro", label: "Seguro" },
              ] as const
            ).map((item) => (
              <FilterChip
                key={item.id}
                selected={riskFilter === item.id}
                onClick={() => setRiskFilter(item.id)}
              >
                {item.label}
              </FilterChip>
            ))}
          </div>

          {matchedFoods.length === 0 ? (
            <EmptyState
              title="Nenhum alimento ou substância encontrado"
              description="Se você suspeita que o pet ingeriu algo desconhecido, não aguarde sintomas: ligue para uma clínica veterinária 24h."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setRiskFilter("todos");
                    setSpeciesFilter("todos");
                  }}
                  className="min-h-10 rounded-full border border-line bg-paper px-4 text-[0.85rem] font-semibold text-ink"
                >
                  Limpar busca
                </button>
              }
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {matchedFoods.map((item) => {
                const risk = foodRiskMeta[item.risk];
                const isDanger =
                  item.risk === "letal" || item.risk === "toxico";
                return (
                  <li key={item.id}>
                    <Card
                      className={`flex h-full flex-col gap-2.5 border-l-4 ${
                        item.risk === "letal"
                          ? "border-l-danger bg-danger-soft/25"
                          : item.risk === "toxico"
                            ? "border-l-danger"
                            : item.risk === "atencao"
                              ? "border-l-warning"
                              : "border-l-teal"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <CardTitle className="text-[1.02rem]">
                          {item.name}
                        </CardTitle>
                        <Chip tone={risk.tone}>
                          {isDanger ? (
                            <XCircle aria-hidden="true" className="size-3.5" />
                          ) : item.risk === "atencao" ? (
                            <AlertTriangle
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          ) : (
                            <CheckCircle2
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          )}
                          {risk.shortLabel}
                        </Chip>
                      </div>

                      <p className="text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-muted">
                        {foodSpeciesLabels[item.species]}
                      </p>

                      <p className="text-[0.9rem] leading-relaxed text-ink-soft">
                        {item.summary}
                      </p>

                      {item.symptoms.length > 0 ? (
                        <div className="rounded-2xl bg-surface/80 p-3">
                          <p className="text-[0.76rem] font-bold uppercase tracking-[0.06em] text-ink">
                            {item.risk === "seguro"
                              ? "Cuidados no preparo"
                              : "Sinais de alerta"}
                          </p>
                          <ul className="mt-1 flex flex-col gap-1 text-meta text-ink-soft">
                            {item.symptoms.map((symptom) => (
                              <li key={symptom} className="flex gap-1.5">
                                <span aria-hidden="true">•</span>
                                <span>{symptom}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="mt-auto border-t border-line/70 pt-2.5 text-meta leading-relaxed text-ink">
                        <strong className="font-semibold">
                          Conduta imediata:{" "}
                        </strong>
                        {item.immediateAction}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {section !== "alimentos" ? (
        <section
          aria-labelledby="heading-first-aid-protocols"
          className="flex flex-col gap-3 pt-2"
        >
          <div>
            <h2
              id="heading-first-aid-protocols"
              className="font-editorial text-xl font-semibold text-ink"
            >
              Protocolos passo a passo de primeiros socorros
            </h2>
            <p className="text-meta text-muted">
              O que fazer (e o que jamais fazer) enquanto você se desloca até o
              veterinário.
            </p>
          </div>

          {matchedGuides.length === 0 ? (
            <EmptyState
              title="Nenhum protocolo para este termo"
              description="Limpe a busca para visualizar todos os guias de primeiros socorros."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {matchedGuides.map((guide) => (
                <li key={guide.id}>
                  <Card className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-danger-soft text-danger-ink">
                          <HeartPulse aria-hidden="true" className="size-5" />
                        </span>
                        <div>
                          <CardTitle className="text-[1.06rem]">
                            {guide.title}
                          </CardTitle>
                          <p className="mt-0.5 text-[0.9rem] text-ink-soft">
                            {guide.summary}
                          </p>
                        </div>
                      </div>
                      <Chip
                        tone={guide.urgency === "critica" ? "danger" : "warning"}
                      >
                        <ShieldAlert aria-hidden="true" className="size-3.5" />
                        {guide.urgency === "critica"
                          ? "Urgência crítica"
                          : "Urgência alta"}
                      </Chip>
                    </div>

                    <div className="rounded-2xl bg-warning-soft/75 p-3">
                      <p className="text-[0.76rem] font-bold uppercase tracking-[0.06em] text-warning-ink">
                        Sinais de gravidade
                      </p>
                      <ul className="mt-1 flex flex-col gap-1 text-meta text-ink">
                        {guide.redFlags.map((flag) => (
                          <li key={flag} className="flex gap-1.5">
                            <span aria-hidden="true">•</span>
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-teal/25 bg-success-soft/55 p-3">
                        <p className="flex items-center gap-1.5 text-[0.78rem] font-bold uppercase tracking-[0.06em] text-success-ink">
                          <CheckCircle2
                            aria-hidden="true"
                            className="size-4 shrink-0"
                          />
                          O que fazer agora
                        </p>
                        <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-4 text-meta leading-relaxed text-ink">
                          {guide.doSteps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      <div className="rounded-2xl border border-danger/25 bg-danger-soft/55 p-3">
                        <p className="flex items-center gap-1.5 text-[0.78rem] font-bold uppercase tracking-[0.06em] text-danger-ink">
                          <XCircle
                            aria-hidden="true"
                            className="size-4 shrink-0"
                          />
                          O que NUNCA fazer
                        </p>
                        <ul className="mt-2 flex flex-col gap-1.5 text-meta leading-relaxed text-ink">
                          {guide.dontSteps.map((step) => (
                            <li key={step} className="flex gap-1.5">
                              <span aria-hidden="true">✕</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
