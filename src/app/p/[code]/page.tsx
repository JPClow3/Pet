import {
  BadgeCheck,
  CalendarClock,
  MapPin,
  PawPrint,
  Phone,
  Siren,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { Brand } from "@/components/brand";
import { Chip } from "@/components/ui/chip";
import { PublicMicrochipSection } from "@/components/public-microchip-section";
import { decodePublicCard } from "@/lib/domain/card";
import { MANAGED_CARD_TOKEN } from "@/lib/domain/managed-card";
import { readManagedPublicCard } from "@/lib/cloud/server-cards";
import type { PublicPetCard } from "@/lib/domain/schema";
import { formatShortDate } from "@/lib/domain/dates";
import { speciesLabels } from "@/lib/domain/labels";

type Params = Promise<{ code: string }>;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carteirinha compartilhada",
  description:
    "Informações do pet escolhidas pelo tutor para este compartilhamento.",
  referrer: "no-referrer",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  openGraph: {
    title: "Carteirinha compartilhada · Zelupi",
    description:
      "Informações do pet escolhidas pelo tutor para este compartilhamento.",
  },
};

export default async function PublicCardPage({ params }: { params: Params }) {
  const { code } = await params;
  let card: PublicPetCard | null = null;
  let managed: Awaited<ReturnType<typeof readManagedPublicCard>> = null;
  let unavailable = false;
  if (MANAGED_CARD_TOKEN.test(code)) {
    try {
      managed = await readManagedPublicCard(code);
      card = managed?.card ?? null;
    } catch {
      unavailable = true;
    }
  } else if (!code.startsWith("c_") && code.length <= 20000)
    card = decodePublicCard(code);

  if (!card) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <Brand href="/welcome" className="mb-3" />
        <span className="flex size-14 items-center justify-center rounded-full bg-surface text-muted">
          <PawPrint aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-xl font-semibold text-ink">
          {unavailable
            ? "Carteirinha temporariamente indisponível"
            : "Carteirinha não encontrada"}
        </h1>
        <p className="text-body text-muted">
          {unavailable
            ? "Não foi possível consultar a publicação. Tente novamente quando estiver conectado."
            : "Este link pode estar incompleto, ter expirado ou ter sido encerrado pelo tutor. Peça um novo compartilhamento."}
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex min-h-11 items-center rounded-full bg-teal-ink px-5 font-medium text-white"
        >
          Conhecer a Zelupi
        </Link>
      </main>
    );
  }

  const healthLabel =
    card.health?.status === "vencido"
      ? "Precisa de atenção"
      : card.health?.status === "atencao"
        ? "Cuidado próximo"
        : card.health?.status === "em_dia"
          ? "Em dia"
          : null;
  const phone = card.contact?.replace(/[^\d+]/g, "") ?? "";
  const canCall = /^\+?\d{7,15}$/.test(phone);
  const generatedAt = card.generatedAt
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(card.generatedAt))
    : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-10">
      <Brand href="/welcome" className="mb-2 self-center" />
      <section className="flex flex-col items-center gap-3 rounded-feature border border-line/80 bg-paper p-6 text-center shadow-card">
        <span className="flex size-20 items-center justify-center rounded-card bg-blue-soft text-blue-deep">
          <PawPrint aria-hidden="true" className="size-9" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-ink">{card.name}</h1>
          <p className="text-body text-muted">
            {[speciesLabels[card.species], card.breed, card.city]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <p className="text-meta leading-relaxed text-muted">
          {managed
            ? `Publicação atualizada em ${generatedAt} (UTC). O tutor pode alterar ou encerrar este link.`
            : generatedAt
              ? `Cópia gerada em ${generatedAt} (UTC).`
              : "Cópia sem data de geração disponível."}{" "}
          {!managed
            ? "As informações refletem esse momento e não são atualizadas neste link."
            : `Válida até ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(new Date(managed.expiresAt))} (UTC).`}
        </p>

        {card.lost ? (
          <div className="flex w-full flex-col gap-2 rounded-card bg-danger/12 p-3 text-left">
            <p className="flex items-center gap-2 font-semibold text-danger-ink">
              <Siren aria-hidden="true" className="size-4" />
              {managed
                ? "Modo perdido nesta publicação"
                : "Modo perdido nesta cópia"}
              {card.lost.since
                ? ` desde ${formatShortDate(card.lost.since)}`
                : ""}
            </p>
            {card.lost.neighborhood ? (
              <p className="text-label font-semibold text-danger-ink">
                Visto por último no bairro: {card.lost.neighborhood}
              </p>
            ) : null}
            {card.lost.reward ? (
              <div className="rounded-xl border border-amber-300 bg-amber-100 p-2 text-center text-sm font-bold text-amber-900">
                RECOMPENSA OFERECIDA: {card.lost.reward}
              </div>
            ) : null}
            <p className="text-label text-danger-ink/90">
              {card.lost.note ??
                (card.contact
                  ? "Se você encontrou este pet, use o contato compartilhado abaixo."
                  : "Se você encontrou este pet, procure ajuda de um serviço veterinário ou de proteção animal local.")}
            </p>
          </div>
        ) : null}

        <PublicMicrochipSection
          microchip={card.microchip}
          petName={card.name}
        />

        <div className="flex flex-wrap justify-center gap-1.5">
          {healthLabel ? (
            <Chip tone={card.health?.status === "vencido" ? "danger" : "teal"}>
              <BadgeCheck aria-hidden="true" className="size-3.5" />
              {managed ? "Cuidados publicados" : "Cuidados na geração"}:{" "}
              {healthLabel}
            </Chip>
          ) : null}
          {card.health?.nextDueDate ? (
            <Chip tone="muted">
              <CalendarClock aria-hidden="true" className="size-3.5" />
              Próximo cuidado em {formatShortDate(card.health.nextDueDate)}
            </Chip>
          ) : null}
          {card.city ? (
            <Chip tone="muted">
              <MapPin aria-hidden="true" className="size-3.5" />
              {card.city}
            </Chip>
          ) : null}
        </div>

        {card.health ? (
          <p className="text-meta leading-relaxed text-muted">
            Resumo dos registros informados pelo tutor. Não é uma avaliação
            clínica nem comprova a saúde atual do pet.
          </p>
        ) : null}

        {card.contact && canCall ? (
          <a
            href={`tel:${phone}`}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-teal-ink px-5 font-semibold text-white transition-colors hover:bg-teal-deep"
          >
            <Phone aria-hidden="true" className="size-4" />
            Falar com o tutor
          </a>
        ) : card.contact ? (
          <p className="break-words text-meta text-ink">
            Contato compartilhado pelo tutor: {card.contact}
          </p>
        ) : (
          <p className="text-meta text-muted">
            Não há contato nesta cópia. Se encontrou o pet, procure um serviço
            veterinário ou de proteção animal local para orientação segura.
          </p>
        )}
      </section>

      <p className="text-center text-meta text-muted">
        {managed
          ? "Informações selecionadas e publicadas pelo tutor. O link mostra a última publicação aprovada; mudanças no aparelho do tutor não são publicadas automaticamente. Imagens ou capturas já salvas podem continuar existindo após a revogação."
          : "Esta cópia foi compartilhada pelo tutor. Links já enviados continuam acessíveis mesmo após mudanças de privacidade ou do modo perdido."}
      </p>

      <Link
        href="/welcome"
        className="mx-auto inline-flex min-h-11 items-center justify-center rounded-control border border-line px-5 text-label font-semibold text-ink transition-colors hover:bg-surface"
      >
        Criar a carteirinha do meu pet
      </Link>
    </main>
  );
}
