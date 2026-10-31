"use client";

import {
  BadgeCheck,
  Check,
  ChevronRight,
  ExternalLink,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Phone,
  ShieldAlert,
  Siren,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { placeVisualThemes } from "@/components/place-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckboxRow, Field, Input, Textarea } from "@/components/ui/field";
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
  formatKm,
  isEmergency24hPlace,
  placeContactLinks,
  placeRating,
  reviewsForPlace,
} from "@/lib/domain/places";
import type { PlaceAttribute } from "@/lib/domain/schema";
import { placeCategoryIcons } from "@/lib/icons";
import { useOrigin } from "@/lib/geo";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";
import { useAsyncAction } from "@/lib/use-async-action";

export default function PlaceDetailPage() {
  const ready = useHydrated();
  const params = useParams<{ placeId: string }>();
  const router = useRouter();
  const place = useAppStore((state) =>
    state.places.find((item) => item.id === params.placeId),
  );
  const reviews = useAppStore((state) => state.reviews);
  const addReview = useAppStore((state) => state.addReview);
  const updatePlace = useAppStore((state) => state.updatePlace);
  const removePlace = useAppStore((state) => state.removePlace);
  const toggleFavoritePlace = useAppStore((state) => state.toggleFavoritePlace);
  const track = useAppStore((state) => state.track);
  const { origin, status } = useOrigin();

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [criteria, setCriteria] = useState<PlaceAttribute[]>([]);
  const [text, setText] = useState("");
  const action = useAsyncAction();

  // Edit contact/notes state
  const [editPhone, setEditPhone] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editIs24h, setEditIs24h] = useState(false);

  useEffect(() => {
    if (place)
      void track("place_view", {
        placeId: place.id,
        category: place.category,
      }).catch(() => {});
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
  const is24h = isEmergency24hPlace(place);
  const { callHref, waHref } = placeContactLinks(
    place,
    `Olá! Vi o contato de ${place.name} na Zelupi e gostaria de atendimento veterinário.`,
  );
  const sourceLabel =
    place.source === "osm"
      ? "Mapa colaborativo"
      : place.seeded
        ? "Exemplo fictício"
        : "Adicionado neste aparelho";
  const theme = placeVisualThemes[place.category];

  function openEditSheet() {
    if (!place) return;
    setEditPhone(place.phone ?? "");
    setEditWhatsapp(place.whatsapp ?? "");
    setEditHours(place.openingHours ?? "");
    setEditAddress(place.address ?? "");
    setEditNotes(place.notes ?? "");
    setEditIs24h(place.attributes.includes("emergencia_24h"));
    setEditOpen(true);
  }

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={place.name}
        subtitle={`${placeCategoryMeta[place.category].label} · ${place.neighborhood}`}
        backHref="/explore"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={place.favorite ? "danger" : "secondary"}
              aria-pressed={Boolean(place.favorite)}
              onClick={() => {
                void toggleFavoritePlace(place.id).then((fav) => {
                  toast(
                    fav
                      ? "Marcado como local de confiança"
                      : "Removido dos favoritos",
                  );
                });
              }}
            >
              <Heart
                aria-hidden="true"
                className={`size-4 ${place.favorite ? "fill-current" : ""}`}
              />
              {place.favorite ? "Favorito" : "Favoritar"}
            </Button>
            <Button size="sm" variant="secondary" onClick={openEditSheet}>
              <Pencil aria-hidden="true" className="size-4" />
              Editar contato
            </Button>
          </div>
        }
      />

      <section
        className={`relative overflow-hidden rounded-sheet border-l-[6px] ${theme.surface} ${theme.rail} p-5`}
      >
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <span className="flex size-16 items-center justify-center rounded-feature border border-line/60 bg-paper/90 text-teal-ink shadow-sm backdrop-blur-sm">
            <Icon aria-hidden="true" className="size-8" />
          </span>
          <div className="flex flex-col items-end gap-2 text-right">
            <div className="flex flex-wrap justify-end gap-1.5">
              {is24h ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-3 py-1 text-caption font-semibold text-danger-ink">
                  <Siren aria-hidden="true" className="size-3.5" />
                  Emergência 24h
                </span>
              ) : null}
              <span className="rounded-full bg-paper/85 px-3 py-1 text-caption font-semibold text-ink-soft">
                {placeCategoryMeta[place.category].label}
              </span>
            </div>
            <span className="text-caption font-semibold text-ink-soft">
              {sourceLabel}
            </span>
          </div>
        </div>
      </section>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {place.favorite ? (
            <Chip tone="teal">
              <Heart aria-hidden="true" className="size-3.5 fill-current" />
              Local de confiança
            </Chip>
          ) : null}
          {place.source === "osm" ? (
            <Chip tone="info">
              <Globe aria-hidden="true" className="size-3.5" />
              Dados de mapa colaborativo
            </Chip>
          ) : place.seeded ? (
            <Chip tone="warning">
              <ShieldAlert aria-hidden="true" className="size-3.5" />
              Exemplo fictício · adicione um contato real para usar
            </Chip>
          ) : place.verified ? (
            <Chip tone="teal">
              <BadgeCheck aria-hidden="true" className="size-3.5" />
              Cadastrado neste aparelho
            </Chip>
          ) : (
            <Chip tone="muted">Verificação não cadastrada</Chip>
          )}
        </div>

        <div>
          <p className="flex items-start gap-2 text-body leading-relaxed text-ink-soft">
            <MapPin
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-blue"
            />
            <span>
              {place.address} · {place.neighborhood}
            </span>
          </p>
          <p className="mt-1 pl-7 text-meta text-muted">
            {formatKm(distance)} de distância estimada a partir{" "}
            {status === "precisa"
              ? "da sua localização"
              : `do centro de ${place.city}`}
          </p>
          {place.openingHours ? (
            <p className="mt-1 pl-7 text-meta font-semibold text-ink-soft">
              Horário: {place.openingHours}
            </p>
          ) : null}
          {place.notes ? (
            <p className="mt-2 rounded-card bg-surface px-3.5 py-2.5 text-label leading-relaxed text-ink-soft">
              {place.notes}
            </p>
          ) : null}
        </div>

        {(callHref || waHref) ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {callHref ? (
              <a
                href={callHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-teal px-4 text-body font-semibold text-white transition-colors hover:bg-teal-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink focus-visible:ring-offset-2"
              >
                <Phone aria-hidden="true" className="size-4" />
                Ligar ({place.phone})
              </a>
            ) : null}
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control border border-success-ink/35 bg-success-soft px-4 text-body font-semibold text-success-ink transition-colors hover:border-success-ink/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-ink focus-visible:ring-offset-2"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                Chamar no WhatsApp
                <ExternalLink aria-hidden="true" className="size-3.5 opacity-75" />
              </a>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-dashed border-line bg-surface/50 px-3.5 py-2.5">
            <span className="text-meta text-muted">
              {place.seeded
                ? "Local fictício: sem telefone para ligar."
                : "Nenhum telefone ou WhatsApp salvo para acionamento rápido."}
            </span>
            <button
              type="button"
              onClick={openEditSheet}
              className="text-meta font-semibold text-teal-ink hover:underline"
            >
              Adicionar telefone / WhatsApp
            </button>
          </div>
        )}

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
          {place.seeded ? (
            <p className="flex min-h-12 flex-1 items-center rounded-control bg-surface px-4 text-meta font-semibold text-muted">
              Rotas indisponíveis para locais fictícios do exemplo
            </p>
          ) : (
            <a
              href={directionsUrl(place)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                void track("directions_clicked", { placeId: place.id }).catch(
                  () => {},
                )
              }
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-blue px-4 text-label font-semibold text-white transition-colors hover:bg-blue-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
            >
              <Navigation aria-hidden="true" className="size-4" />
              Abrir rota no mapa
              <ExternalLink
                aria-hidden="true"
                className="size-3.5 opacity-75"
              />
            </a>
          )}
          <Button variant="secondary" size="lg" onClick={() => setOpen(true)}>
            Escrever avaliação local
          </Button>
        </div>
        <p className="text-caption leading-relaxed text-muted">
          {place.seeded
            ? "Este endereço é ilustrativo. Edite os contatos ou cadastre sua própria clínica de confiança para uso real."
            : "A rota abre em outro aplicativo. Confirme horário, plantão e disponibilidade por telefone antes de visitar."}
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
              <li
                key={score.attribute}
                className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3"
              >
                <span className="min-w-[7.5rem] flex-1 text-label text-ink-soft sm:w-40 sm:flex-none">
                  {placeAttributeLabels[score.attribute].label}
                </span>
                <span className="h-2 min-w-[5rem] flex-1 overflow-hidden rounded-full bg-paper">
                  <span
                    className={`block h-full rounded-full ${placeAttributeLabels[score.attribute].negative ? "bg-sun" : "bg-teal"}`}
                    style={{
                      width: `${Math.round(score.positiveRatio * 100)}%`,
                    }}
                  />
                </span>
                <span className="text-meta tabular-nums text-muted">
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
            <p className="text-caption font-semibold text-muted">
              Experiências
            </p>
            <h2 className="mt-1 text-h3 font-semibold text-ink">
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
                <Card className="flex flex-col gap-2 rounded-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-body font-semibold text-ink">
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
                    <p className="text-body leading-relaxed text-ink-soft/90">
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
          {place.source === "osm"
            ? "mapa colaborativo (© colaboradores do OpenStreetMap). Confirme plantão e telefone antes de se deslocar."
            : place.seeded
              ? "este local é fictício e só ilustra o catálogo. Ao adicionar um telefone real, ele passa a ser um local seu neste aparelho."
              : "local cadastrado e gerenciado por você neste aparelho."}
        </p>
      </Card>

      {!place.seeded ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-danger-ink"
          onClick={() => {
            void removePlace(place.id).then(() => {
              toast("Local removido deste aparelho");
              router.push("/explore");
            });
          }}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Remover este local do aparelho
        </Button>
      ) : null}

      <Link
        href="/explore"
        className="inline-flex min-h-11 items-center gap-1 self-start text-label font-semibold text-blue-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
      >
        <ChevronRight aria-hidden="true" className="size-4 rotate-180" />
        Voltar para Locais
      </Link>

      <BottomSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Contatos de ${place.name}`}
        description="Atualize telefone, WhatsApp, plantão 24h e observações neste aparelho."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async () => {
              const nextAttrs = new Set(place.attributes);
              if (editIs24h) nextAttrs.add("emergencia_24h");
              else nextAttrs.delete("emergencia_24h");
              await updatePlace(place.id, {
                phone: editPhone.trim() || null,
                whatsapp: editWhatsapp.trim() || null,
                openingHours: editHours.trim() || null,
                address: editAddress.trim() || place.address,
                notes: editNotes.trim() || null,
                attributes: [...nextAttrs],
                seeded: false,
                verified: true,
              });
              setEditOpen(false);
              toast.success("Contatos atualizados neste aparelho!");
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field htmlFor="edit-phone" label="Telefone">
            <Input
              id="edit-phone"
              type="tel"
              maxLength={40}
              placeholder="(11) 3062-0100"
              value={editPhone}
              onChange={(event) => setEditPhone(event.target.value)}
            />
          </Field>
          <Field htmlFor="edit-whatsapp" label="WhatsApp">
            <Input
              id="edit-whatsapp"
              type="tel"
              maxLength={40}
              placeholder="(11) 99000-0100"
              value={editWhatsapp}
              onChange={(event) => setEditWhatsapp(event.target.value)}
            />
          </Field>
          <Field htmlFor="edit-hours" label="Horário / Plantão">
            <Input
              id="edit-hours"
              maxLength={160}
              placeholder="Plantão 24h todos os dias"
              value={editHours}
              onChange={(event) => setEditHours(event.target.value)}
            />
          </Field>
          <Field htmlFor="edit-address" label="Endereço">
            <Input
              id="edit-address"
              maxLength={160}
              value={editAddress}
              onChange={(event) => setEditAddress(event.target.value)}
            />
          </Field>
          <Field htmlFor="edit-notes" label="Observações">
            <Textarea
              id="edit-notes"
              rows={2}
              maxLength={400}
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
            />
          </Field>
          <CheckboxRow
            checked={editIs24h}
            onChange={setEditIs24h}
            label="Atende emergência 24 horas"
            description="Destaca este local nas buscas de urgência."
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setEditOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={action.pending}>
              Salvar contatos
            </Button>
          </div>
        </form>
      </BottomSheet>

      <BottomSheet
        open={open}
        onClose={() => {
          if (!action.pending) setOpen(false);
        }}
        title={`Como foi em ${place.name}?`}
        description="Marque apenas o que você realmente observou. Seu relato ajuda outro tutor a decidir."
      >
        <fieldset
          disabled={action.pending}
          className="flex min-w-0 flex-col gap-5"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="text-label font-semibold text-ink">
              Nota geral
            </legend>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={rating === value}
                  aria-label={`${value} de 5`}
                  onClick={() => setRating(value)}
                  className={`flex size-11 items-center justify-center rounded-card border text-body font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 ${rating >= value ? "border-sun bg-sun-soft text-warning-ink" : "border-line bg-paper text-muted"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-label font-semibold text-ink">
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
                    className={`min-h-11 rounded-full border px-3 text-meta font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 ${selected ? "border-teal bg-teal text-white" : "border-line bg-paper text-ink-soft hover:bg-lime-soft"}`}
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

          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              className="flex-1"
              onClick={() =>
                void action.run(async () => {
                  await addReview({
                    placeId: place.id,
                    rating,
                    criteria,
                    text: text.trim() || null,
                  });
                  setOpen(false);
                  setText("");
                  setCriteria([]);
                  toast.success("Avaliação salva neste aparelho", {
                    description: "Este exemplo não é enviado a outros tutores.",
                  });
                })
              }
            >
              Salvar avaliação neste aparelho
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </fieldset>
      </BottomSheet>
    </div>
  );
}
