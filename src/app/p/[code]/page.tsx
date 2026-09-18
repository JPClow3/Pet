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

import { Chip } from "@/components/ui/chip";
import { decodePublicCard } from "@/lib/domain/card";
import { formatShortDate } from "@/lib/domain/dates";
import { speciesLabels, speciesPluralLabels } from "@/lib/domain/labels";

type Params = Promise<{ code: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { code } = await params;
  const card = decodePublicCard(code);
  if (!card) return { title: "Carteirinha não encontrada" };
  return {
    title: `Carteirinha de ${card.name}`,
    description: `Dados públicos de ${card.name} no PetHub.`,
  };
}

export default async function PublicCardPage({ params }: { params: Params }) {
  const { code } = await params;
  const card = decodePublicCard(code);

  if (!card) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-surface text-muted">
          <PawPrint aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-xl font-semibold text-ink">
          Carteirinha não encontrada
        </h1>
        <p className="text-[0.95rem] text-muted">
          Este link pode estar incompleto. Peça para o tutor compartilhar
          novamente.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex min-h-11 items-center rounded-full bg-teal-ink px-5 font-medium text-white"
        >
          Conhecer o PetHub
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-10">
      <section className="flex flex-col items-center gap-3 rounded-[24px] border border-line/80 bg-white p-6 text-center shadow-card">
        <span className="flex size-20 items-center justify-center rounded-2xl bg-blue-soft text-blue-deep">
          <PawPrint aria-hidden="true" className="size-9" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-ink">{card.name}</h1>
          <p className="text-[0.95rem] text-muted">
            {[speciesLabels[card.species], card.breed, card.city]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {card.lost ? (
          <div className="flex w-full flex-col gap-1 rounded-2xl bg-danger/12 p-3 text-left">
            <p className="flex items-center gap-2 font-semibold text-danger-ink">
              <Siren aria-hidden="true" className="size-4" />
              Pet perdido
              {card.lost.since
                ? ` desde ${formatShortDate(card.lost.since)}`
                : ""}
            </p>
            <p className="text-[0.9rem] text-danger-ink/90">
              {card.lost.note ??
                "Se você encontrou este pet, entre em contato pelo número abaixo."}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-center gap-1.5">
          {healthLabel ? (
            <Chip tone={card.health?.status === "vencido" ? "danger" : "teal"}>
              <BadgeCheck aria-hidden="true" className="size-3.5" />
              Saúde: {healthLabel}
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

        {card.contact ? (
          <a
            href={`tel:${card.contact.replace(/[^\d+]/g, "")}`}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-teal-ink px-5 font-semibold text-white transition-colors hover:bg-teal-deep"
          >
            <Phone aria-hidden="true" className="size-4" />
            Falar com o tutor
          </a>
        ) : (
          <p className="text-meta text-muted">
            O tutor não disponibilizou contato nesta carteirinha.
          </p>
        )}
      </section>

      <p className="text-center text-meta text-muted">
        Página pública controlada pelo tutor.{" "}
        {speciesPluralLabels[card.species]} também podem ter uma carteirinha
        como esta.
      </p>

      <Link
        href="/welcome"
        className="mx-auto inline-flex min-h-11 items-center justify-center rounded-[14px] border border-line px-5 text-[0.9rem] font-semibold text-ink transition-colors hover:bg-surface"
      >
        Criar a carteirinha do meu pet
      </Link>
    </main>
  );
}
