"use client";

import {
  BadgeCheck,
  Check,
  ChevronRight,
  ExternalLink,
  MapPin,
  Navigation,
  ShieldAlert,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Textarea } from "@/components/ui/field";
import { BottomSheet } from "@/components/ui/sheet";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { relativeTimeLabel } from "@/lib/domain/dates";
import {
  REVIEW_CRITERIA,
  placeAttributeLabels,
  placeCategoryMeta,
} from "@/lib/domain/labels";
import {
  criterionScores,
  directionsUrl,
  distanceKm,
  placeRating,
  reviewsForPlace,
} from "@/lib/domain/places";
import type { PlaceAttribute } from "@/lib/domain/schema";
import { placeCategoryIcons } from "@/lib/icons";
import { useOrigin } from "@/lib/geo";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

const visualThemes = {
  parque: { surface: "bg-lime-soft", rail: "border-l-teal" },
  restaurante: { surface: "bg-sun-soft", rail: "border-l-sun" },
  veterinario: { surface: "bg-blue-soft", rail: "border-l-blue" },
  banho_tosa: { surface: "bg-violet-soft", rail: "border-l-violet" },
  hospedagem: { surface: "bg-surface", rail: "border-l-teal" },
  passeador_adestrador: { surface: "bg-accent-soft", rail: "border-l-accent" },
} as const;

export default function PlaceDetailPage() {
  const ready = useHydrated();
  const params = useParams<{ placeId: string }>();
  const place = useAppStore((state) =>
    state.places.find((item) => item.id === params.placeId),
  );
  const reviews = useAppStore((state) => state.reviews);
  const addReview = useAppStore((state) => state.addReview);
  const track = useAppStore((state) => state.track);
  const { origin } = useOrigin();

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [criteria, setCriteria] = useState<PlaceAttribute[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (place)
      track("place_view", { placeId: place.id, category: place.category });
  }, [place, track]);

  const placeReviews = useMemo(
    () => (place ? reviewsForPlace(reviews, place.id) : []),
    [reviews, place],
  );
  const scores = useMemo(() => criterionScores(placeReviews), [placeReviews]);
  const ratingSummary = useMemo(
    () => placeRating(placeReviews),
    [placeReviews],
  );

  if (!ready) return <SkeletonScreen label="Carregando detalhes do local" />;

  if (!place) {
    return (
      <EmptyState
        title="Local não encontrado"
        description="Esse local pode ter sido removido do catálogo deste aparelho."
        action={<ButtonLink href="/explore">Voltar para Locais</ButtonLink>}
      />
    );
  }

  const Icon = placeCategoryIcons[place.category];
  const distance = distanceKm(origin, place);
  const sourceLabel = place.seeded
    ? "Exemplo do catálogo"
    : "Adicionado neste aparelho";

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={place.name}
        subtitle={`${placeCategoryMeta[place.category].label} · ${place.neighborhood}`}
        backHref="/explore"
      />

      <section
        className={`relative overflow-hidden rounded-[28px] border-l-[6px] ${visualThemes[place.category].surface} ${visualThemes[place.category].rail} p-5`}
      >
        <div className="relative flex items-end justify-between gap-4">
          <span className="flex size-16 items-center justify-center rounded-[22px] border border-white/70 bg-white/80 text-teal-ink shadow-sm backdrop-blur-sm">
            <Icon aria-hidden="true" className="size-8" />
          </span>
          <div className="flex flex-col items-end gap-2 text-right">
            <span className="rounded-full bg-white/80 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-ink-soft/80">
              {placeCategoryMeta[place.category].label}
            </span>
            <span className="text-[0.72rem] font-semibold text-ink-soft/70">
              {sourceLabel}
            </span>
          </div>
        </div>
      </section>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="warning">
            <ShieldAlert aria-hidden="true" className="size-3.5" />
            Atualização não informada
          </Chip>
          {place.verified ? (
            <Chip tone="muted">
              <BadgeCheck aria-hidden="true" className="size-3.5" />
              Verificação cadastrada
            </Chip>
          ) : (
            <Chip tone="muted">Verificação não cadastrada</Chip>
          )}
        </div>

        <div>
          <p className="flex items-start gap-2 text-[0.95rem] leading-relaxed text-ink-soft">
            <MapPin
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-blue"
            />
            <span>
              {place.address} · {place.neighborhood}
            </span>
          </p>
          <p className="mt-1 pl-7 text-meta text-muted">
            {distance} km de distância estimada a partir da região escolhida
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-line/70 py-3">
          <span className="inline-flex items-center gap-1.5 text-meta text-ink-soft">
            <Star
              aria-hidden="true"
              className="size-4 fill-sun text-warning-ink"
            />
            {ratingSummary.total === 0
              ? "Sem avaliações"
              : `${ratingSummary.average} de 5`}
          </span>
          <span className="text-meta text-muted">
            {ratingSummary.total === 0
              ? "Seja o primeiro relato"
              : `${ratingSummary.total} relato${ratingSummary.total === 1 ? "" : "s"} estruturado${ratingSummary.total === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {place.attributes.map((attribute) => (
            <Chip
              key={attribute}
              tone={
                placeAttributeLabels[attribute].negative ? "warning" : "mint"
              }
            >
              {placeAttributeLabels[attribute].label}
            </Chip>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={directionsUrl(place)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("directions_clicked", { placeId: place.id })}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-blue px-4 text-[0.9rem] font-semibold text-white transition-colors hover:bg-blue-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
          >
            <Navigation aria-hidden="true" className="size-4" />
            Abrir rota
            <ExternalLink aria-hidden="true" className="size-3.5 opacity-75" />
          </a>
          <Button variant="secondary" size="lg" onClick={() => setOpen(true)}>
            Avaliar local
          </Button>
        </div>
        <p className="text-[0.7rem] leading-relaxed text-muted">
          A rota abre em outro aplicativo. Horário, contato e disponibilidade
          atuais não estão disponíveis nesta prévia.
        </p>
      </Card>

      <Card className="flex flex-col gap-3 border-l-4 border-l-teal bg-lime-soft p-5">
        <div className="flex items-start gap-3">
          <Check
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-teal-deep"
          />
          <div>
            <CardTitle className="text-teal-deep">
              O que pode combinar com o seu pet
            </CardTitle>
            <p className="mt-1 text-meta leading-relaxed text-ink-soft/80">
              Os sinais abaixo vêm de atributos marcados e de relatos
              estruturados. Eles não substituem uma visita ao local.
            </p>
          </div>
        </div>
        {scores.length === 0 ? (
          <p className="text-meta text-muted">
            Ainda não há relatos estruturados. Você pode registrar uma
            experiência depois da visita.
          </p>
        ) : (
          <ul
            className="flex flex-col gap-3"
            aria-label="Atributos observados por tutores"
          >
            {scores.map((score) => (
              <li key={score.attribute} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-[0.88rem] text-ink-soft">
                  {placeAttributeLabels[score.attribute].label}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                  <span
                    className={`block h-full rounded-full ${placeAttributeLabels[score.attribute].negative ? "bg-sun" : "bg-teal"}`}
                    style={{
                      width: `${Math.round(score.positiveRatio * 100)}%`,
                    }}
                  />
                </span>
                <span className="text-meta text-muted">
                  {score.positive}/{score.total}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted">
              Experiências
            </p>
            <h2 className="mt-1 text-[1.14rem] font-semibold text-ink">
              Relatos de tutores
            </h2>
          </div>
          <span className="text-meta text-muted">
            {placeReviews.length} total
          </span>
        </div>
        {placeReviews.length === 0 ? (
          <EmptyState
            title="Nenhuma avaliação ainda"
            description="Conte o que funcionou para o seu pet: área externa, água, ruído ou paciência da equipe."
            action={
              <Button onClick={() => setOpen(true)}>Avaliar este local</Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {placeReviews.map((review) => (
              <li key={review.id}>
                <Card className="flex flex-col gap-2 rounded-[20px] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[0.95rem] font-semibold text-ink">
                        {review.authorName}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-meta text-warning-ink">
                        <Star
                          aria-hidden="true"
                          className="size-3.5 fill-sun"
                        />
                        {review.rating} de 5
                      </p>
                    </div>
                    <time
                      dateTime={review.createdAt}
                      className="text-meta text-muted"
                    >
                      {relativeTimeLabel(review.createdAt)}
                    </time>
                  </div>
                  {review.text ? (
                    <p className="text-[0.92rem] leading-relaxed text-ink-soft/90">
                      {review.text}
                    </p>
                  ) : null}
                  {review.criteria.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 border-t border-line/70 pt-2">
                      {review.criteria.map((attribute) => (
                        <Chip
                          key={attribute}
                          tone={
                            placeAttributeLabels[attribute].negative
                              ? "warning"
                              : "mint"
                          }
                        >
                          {placeAttributeLabels[attribute].label}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card className="border-accent/25 bg-accent-soft p-4">
        <p className="text-meta leading-relaxed text-ink-soft/80">
          <strong className="font-semibold text-accent-deep">
            Fonte e atualização:
          </strong>{" "}
          este local vem de uma prévia do catálogo. Ainda não temos uma fonte,
          data de atualização ou confirmação de horário atual no app.
        </p>
      </Card>

      <Link
        href="/explore"
        className="inline-flex min-h-11 items-center gap-1 self-start text-[0.85rem] font-semibold text-blue-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
      >
        <ChevronRight aria-hidden="true" className="size-4 rotate-180" />
        Voltar para Locais
      </Link>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Como foi em ${place.name}?`}
        description="Marque apenas o que você realmente observou. Seu relato ajuda outro tutor a decidir."
      >
        <div className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-[0.88rem] font-semibold text-ink">
              Nota geral
            </legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={rating === value}
                  aria-label={`${value} de 5`}
                  onClick={() => setRating(value)}
                  className={`flex size-11 items-center justify-center rounded-2xl border text-[0.95rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 ${rating >= value ? "border-sun bg-sun-soft text-warning-ink" : "border-line bg-white text-muted"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[0.88rem] font-semibold text-ink">
              O que você observou
            </legend>
            <p className="text-meta text-muted">
              Selecione atributos concretos, sem transformar o relato em uma
              nota clínica.
            </p>
            <div className="flex flex-wrap gap-2">
              {REVIEW_CRITERIA.map((attribute) => {
                const selected = criteria.includes(attribute);
                return (
                  <button
                    key={attribute}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setCriteria((current) =>
                        selected
                          ? current.filter((item) => item !== attribute)
                          : [...current, attribute],
                      )
                    }
                    className={`min-h-10 rounded-full border px-3 text-[0.82rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 ${selected ? "border-teal bg-teal text-white" : "border-line bg-white text-ink-soft hover:bg-lime-soft"}`}
                  >
                    {placeAttributeLabels[attribute].label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Field
            label="Comentário"
            htmlFor="review-text"
            hint="Opcional, até 600 caracteres"
          >
            <Textarea
              id="review-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={600}
              placeholder="Área externa ampla e a equipe trouxe água sem pedir."
            />
          </Field>

          <div className="flex gap-2">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => {
                addReview({
                  placeId: place.id,
                  rating,
                  criteria,
                  text: text.trim() || null,
                });
                setOpen(false);
                setText("");
                setCriteria([]);
                toast.success("Avaliação salva", {
                  description: "Obrigado por ajudar outro tutor.",
                });
              }}
            >
              Publicar avaliação
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
