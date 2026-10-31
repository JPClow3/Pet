"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  HeartPulse,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Siren,
  WifiOff,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
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

// With a narrow search, open the matches so the answer is one glance away.
const AUTO_OPEN_LIMIT = 3;

const summaryClass =
  "flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden";

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

  // Only contacts the tutor saved themselves: never a demo catalogue entry.
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
    const saved24h = places.filter(
      (place) =>
        !place.seeded && isEmergency24hPlace(place) && Boolean(place.phone),
    );
    const chosen =
      saved24h.find((place) => place.favorite) ?? saved24h[0] ?? null;
    if (!chosen) return null;
    return {
      name: chosen.name,
      phone: chosen.phone ?? null,
      whatsapp: chosen.whatsapp ?? chosen.phone ?? null,
      badge: chosen.favorite ? "Sua clínica 24h" : "Clínica 24h salva",
    };
  }, [activePet, places]);

  const callHref = phoneCallUrl(primaryEmergencyContact?.phone);
  const waHref = whatsappUrl(
    primaryEmergencyContact?.whatsapp,
    `Olá! Preciso de atendimento veterinário de urgência${activePet ? ` para ${activePet.name}` : ""}.`,
  );

  const searching = query.trim().length > 0;
  const openFoods = searching && matchedFoods.length <= AUTO_OPEN_LIMIT;
  const openGuides = searching && matchedGuides.length <= AUTO_OPEN_LIMIT;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 border-danger/35 bg-danger-soft/50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-danger-soft text-danger-ink">
            <Siren aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <Chip tone="teal" className="px-2 py-0.5 text-caption">
              <WifiOff aria-hidden="true" className="size-3" />
              100% Offline
            </Chip>
            <p className="mt-1.5 text-meta leading-relaxed text-ink-soft">
              Orientações para agir enquanto você vai ao veterinário. Não
              substituem o atendimento presencial.
            </p>
          </div>
        </div>

        {primaryEmergencyContact ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-line/80 bg-paper p-3">
            <div className="min-w-0">
              <span className="text-caption font-bold uppercase tracking-[0.08em] text-danger-ink">
                {primaryEmergencyContact.badge}
              </span>
              <p className="truncate text-label font-semibold text-ink">
                {primaryEmergencyContact.name}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {callHref ? (
                <a
                  href={callHref}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-control bg-danger-ink px-4 text-label font-semibold text-white transition-opacity hover:opacity-95"
                >
                  <Phone aria-hidden="true" className="size-4" />
                  Ligar agora ({primaryEmergencyContact.phone})
                </a>
              ) : null}
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-control border border-success-ink/35 bg-success-soft px-4 text-label font-semibold text-success-ink"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-danger/35 bg-paper p-3">
            <p className="text-label font-semibold text-ink">
              Salve sua clínica 24h de confiança
            </p>
            <p className="text-meta leading-relaxed text-ink-soft">
              Assim o botão de ligar fica aqui, pronto para a hora do susto.
            </p>
            <Link
              href="/explore?cadastrar=1"
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-control bg-danger-ink px-4 text-label font-semibold text-white"
            >
              <Plus aria-hidden="true" className="size-4" />
              Salvar clínica 24h
            </Link>
          </div>
        )}
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
            placeholder="Ex.: uva, xilitol, engasgo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-10"
          />
        </div>

        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar"
          aria-label="Busca rápida"
          role="group"
        >
          {QUICK_PANIC_TERMS.map((term) => {
            const active = query.toLowerCase() === term.toLowerCase();
            return (
              <FilterChip
                key={term}
                selected={active}
                onClick={() => setQuery(active ? "" : term)}
                className="shrink-0"
              >
                {term}
              </FilterChip>
            );
          })}
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto border-b border-line px-4 pb-3 no-scrollbar">
        <FilterChip
          selected={section === "todos"}
          onClick={() => setSection("todos")}
          className="shrink-0"
        >
          Tudo ({matchedFoods.length + matchedGuides.length})
        </FilterChip>
        <FilterChip
          selected={section === "socorros"}
          onClick={() => setSection("socorros")}
          className="shrink-0"
        >
          Primeiros socorros ({matchedGuides.length})
        </FilterChip>
        <FilterChip
          selected={section === "alimentos"}
          onClick={() => setSection("alimentos")}
          className="shrink-0"
        >
          Alimentos e substâncias ({matchedFoods.length})
        </FilterChip>
      </div>

      {section !== "alimentos" ? (
        <section
          aria-labelledby="heading-first-aid-protocols"
          className="flex flex-col gap-3"
        >
          <h2
            id="heading-first-aid-protocols"
            className="text-h3 font-semibold text-ink"
          >
            Protocolos de primeiros socorros
          </h2>

          {matchedGuides.length === 0 ? (
            <EmptyState
              title="Nenhum protocolo para este termo"
              description="Limpe a busca para ver todos os guias de primeiros socorros."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {matchedGuides.map((guide) => (
                <li key={guide.id}>
                  <details
                    key={`${guide.id}-${openGuides}`}
                    open={openGuides}
                    className="group rounded-card border border-line/80 bg-paper"
                  >
                    <summary className={summaryClass}>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <HeartPulse
                          aria-hidden="true"
                          className="size-5 shrink-0 text-danger-ink"
                        />
                        <h3 className="text-label font-semibold text-ink">
                          {guide.title}
                        </h3>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <Chip
                          tone={
                            guide.urgency === "critica" ? "danger" : "warning"
                          }
                          className="px-2 py-0.5 text-caption"
                        >
                          {guide.urgency === "critica" ? "Crítica" : "Alta"}
                        </Chip>
                        <ChevronDown
                          aria-hidden="true"
                          className="size-4 text-muted transition-transform group-open:rotate-180"
                        />
                      </span>
                    </summary>
                    <div className="flex flex-col gap-3 border-t border-line/70 px-4 pb-4 pt-3">
                      <p className="text-label text-ink-soft">
                        {guide.summary}
                      </p>

                      <div className="rounded-2xl bg-warning-soft/75 p-3">
                        <p className="flex items-center gap-1.5 text-label font-bold text-warning-ink">
                          <ShieldAlert
                            aria-hidden="true"
                            className="size-4 shrink-0"
                          />
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

                      <div className="rounded-2xl border border-teal/25 bg-success-soft/55 p-3">
                        <p className="flex items-center gap-1.5 text-label font-bold text-success-ink">
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
                        <p className="flex items-center gap-1.5 text-label font-bold text-danger-ink">
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
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {section !== "socorros" ? (
        <section
          aria-labelledby="heading-toxic-foods"
          className="flex flex-col gap-3 pt-2"
        >
          <div>
            <h2
              id="heading-toxic-foods"
              className="text-h3 font-semibold text-ink"
            >
              Alimentos, plantas e medicamentos
            </h2>
            <p className="text-meta text-muted">
              O que é letal, tóxico ou seguro para cães e gatos.
            </p>
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
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
                className="shrink-0"
              >
                {item.label}
              </FilterChip>
            ))}
            {(
              [
                { id: "letal", label: "Letal" },
                { id: "toxico", label: "Tóxico" },
                { id: "atencao", label: "Atenção" },
                { id: "seguro", label: "Seguro" },
              ] as const
            ).map((item) => (
              <FilterChip
                key={item.id}
                selected={riskFilter === item.id}
                onClick={() =>
                  setRiskFilter(riskFilter === item.id ? "todos" : item.id)
                }
                className="shrink-0"
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
                  className="min-h-11 rounded-full border border-line bg-paper px-4 text-label font-semibold text-ink"
                >
                  Limpar busca
                </button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {matchedFoods.map((item) => {
                const risk = foodRiskMeta[item.risk];
                const isDanger =
                  item.risk === "letal" || item.risk === "toxico";
                return (
                  <li key={item.id}>
                    <details
                      key={`${item.id}-${openFoods}`}
                      open={openFoods}
                      className={`group rounded-card border border-l-4 border-line/80 bg-paper ${
                        isDanger
                          ? "border-l-danger"
                          : item.risk === "atencao"
                            ? "border-l-warning"
                            : "border-l-teal"
                      }`}
                    >
                      <summary className={summaryClass}>
                        <h3 className="min-w-0 text-label font-semibold text-ink">
                          {item.name}
                        </h3>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <Chip
                            tone={risk.tone}
                            className="px-2 py-0.5 text-caption"
                          >
                            {isDanger ? (
                              <XCircle aria-hidden="true" className="size-3" />
                            ) : item.risk === "atencao" ? (
                              <AlertTriangle
                                aria-hidden="true"
                                className="size-3"
                              />
                            ) : (
                              <CheckCircle2
                                aria-hidden="true"
                                className="size-3"
                              />
                            )}
                            {risk.shortLabel}
                          </Chip>
                          <ChevronDown
                            aria-hidden="true"
                            className="size-4 text-muted transition-transform group-open:rotate-180"
                          />
                        </span>
                      </summary>
                      <div className="flex flex-col gap-2.5 border-t border-line/70 px-4 pb-4 pt-3">
                        <p className="text-caption font-semibold text-muted">
                          {foodSpeciesLabels[item.species]}
                        </p>
                        <p className="text-label leading-relaxed text-ink-soft">
                          {item.summary}
                        </p>
                        {item.symptoms.length > 0 ? (
                          <div className="rounded-2xl bg-surface/80 p-3">
                            <p className="text-label font-bold text-ink">
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
                        <p className="text-meta leading-relaxed text-ink">
                          <strong className="font-semibold">
                            Conduta imediata:{" "}
                          </strong>
                          {item.immediateAction}
                        </p>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
