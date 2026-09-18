import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { Chip, type ChipTone } from "@/components/ui/chip";
import {
  itemsForPhase,
  roadmapItems,
  roadmapPhases,
  type RoadmapStatus,
} from "@/lib/roadmap";

export const metadata: Metadata = {
  title: "Roadmap público",
  description:
    "O que estamos construindo para tornar o cuidado de cada pet mais confiável, calmo e útil.",
  robots: { index: true, follow: true },
};

const statusTones: Record<RoadmapStatus, ChipTone> = {
  Agora: "teal",
  Validação: "warning",
  Incompleto: "mint",
  Protótipo: "muted",
  "Preview local": "danger",
  Futuro: "ink",
  Refatoração: "muted",
};

function Brand() {
  return (
    <Link
      href="/welcome"
      aria-label="PetHub, início"
      className="inline-flex min-h-12 items-center gap-2.5 rounded-full"
    >
      <span className="flex size-10 items-center justify-center rounded-[13px] bg-blue text-white">
        <PawPrint aria-hidden="true" className="size-5" />
      </span>
      <span className="text-xl font-extrabold tracking-[-0.04em] text-ink">
        pet<span className="text-blue">hub</span>
        <span className="text-accent">.</span>
      </span>
    </Link>
  );
}

function PhaseDot({ accent }: { accent: string }) {
  const color =
    accent === "blue"
      ? "bg-blue"
      : accent === "sun"
        ? "bg-sun"
        : accent === "teal"
          ? "bg-teal"
          : accent === "violet"
            ? "bg-violet"
            : "bg-accent";

  return (
    <span
      className={`size-2.5 shrink-0 rounded-full ${color}`}
      aria-hidden="true"
    />
  );
}

function RoadmapItemCard({
  item,
  number,
}: {
  item: (typeof roadmapItems)[number];
  number: number;
}) {
  return (
    <article
      id={item.id}
      className="scroll-mt-24 border-t border-line/80 py-5 first:border-t-0 first:pt-0 last:pb-0 sm:py-6"
    >
      <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-4">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-8 items-center justify-center rounded-[10px] border border-line bg-canvas font-mono text-[0.68rem] font-bold text-muted sm:size-9 sm:rounded-xl"
        >
          {String(number).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Chip tone={statusTones[item.status]} className="font-semibold">
              {item.status}
            </Chip>
            {item.source ? (
              <span className="max-w-full break-all font-mono text-[0.65rem] text-muted">
                {item.source}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 max-w-[66ch] text-[1rem] font-bold leading-snug tracking-tight text-ink sm:text-[1.05rem]">
            {item.title}
          </h3>
          <p className="mt-1.5 max-w-[70ch] text-[0.88rem] leading-relaxed text-ink-soft">
            {item.summary}
          </p>
          <details className="group/details mt-3 max-w-[70ch] rounded-[14px] border border-line/70 bg-canvas/60 px-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-meta font-semibold text-teal-ink [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-accent"
                />
                Ver definição e critérios
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 transition-transform duration-200 group-open/details:rotate-180"
              />
            </summary>
            <ul className="space-y-2 border-t border-line/60 pb-3 pt-3 text-meta leading-relaxed text-muted">
              {item.details.map((detail) => (
                <li key={detail} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-accent"
                  />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </article>
  );
}

function PhaseSection({
  phase,
  startNumber,
}: {
  phase: (typeof roadmapPhases)[number];
  startNumber: number;
}) {
  const items = itemsForPhase(phase.id);

  return (
    <section
      id={phase.id}
      aria-labelledby={`${phase.id}-title`}
      className="scroll-mt-24"
    >
      <div className="flex items-start gap-3">
        <PhaseDot accent={phase.accent} />
        <div className="min-w-0">
          <p className="text-meta font-bold uppercase tracking-[0.14em] text-muted">
            {phase.eyebrow}
          </p>
          <h2
            id={`${phase.id}-title`}
            className="mt-1 font-editorial text-[1.55rem] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[1.7rem]"
          >
            {phase.title}
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-[0.88rem] leading-relaxed text-muted">
            {phase.description}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-line/80 bg-white p-5 shadow-none sm:p-6">
        {items.map((item, index) => (
          <RoadmapItemCard
            key={item.id}
            item={item}
            number={startNumber + index}
          />
        ))}
      </div>
    </section>
  );
}

const principles = [
  ["01", "Proteger", "privacidade e história"],
  ["02", "Cuidar", "com contexto e recuperação"],
  ["03", "Conectar", "quando a rede for real"],
] as const;

export default function RoadmapPage() {
  return (
    <main className="min-h-dvh bg-canvas">
      <a
        href="#roadmap"
        className="sr-only z-50 rounded-lg bg-teal-ink p-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Ir para o roadmap
      </a>

      <header className="sticky top-0 z-20 border-b border-line/60 bg-canvas">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <Brand />
          <nav
            aria-label="Navegação do roadmap"
            className="flex items-center gap-1 sm:gap-2"
          >
            <a
              href="#roadmap"
              className="hidden min-h-11 items-center rounded-2xl px-3 text-meta font-bold text-ink-soft transition-colors hover:bg-surface sm:inline-flex"
            >
              Ver roadmap
            </a>
            <ButtonLink href="/welcome" variant="secondary" size="sm">
              <span className="hidden sm:inline">Conhecer o app</span>
              <span className="sm:hidden">PetHub</span>
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </ButtonLink>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] min-w-0 px-4 pb-16 pt-6 sm:px-6 md:pb-12 lg:px-10 lg:pt-9">
        <section className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)] lg:gap-10">
          <div className="min-w-0">
            <p className="inline-flex min-h-8 items-center gap-2 rounded-full border border-blue/20 bg-blue-soft px-3 text-meta font-bold text-blue-deep">
              <Waypoints aria-hidden="true" className="size-3.5" />
              Roadmap público · setembro de 2026
            </p>
            <h1 className="mt-3 max-w-[18ch] font-editorial text-[clamp(2.35rem,6vw,4rem)] font-semibold leading-[0.96] tracking-[-0.045em] text-ink">
              Confiança antes de complexidade.
            </h1>
            <p className="mt-4 max-w-[58ch] text-[0.98rem] leading-relaxed text-ink-soft sm:text-[1.05rem]">
              O mapa aberto do PetHub: o que estamos corrigindo, o que precisa
              de uma base mais forte e o que só faz sentido quando a confiança
              vier primeiro.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
              <ButtonLink href="#roadmap" variant="blue" size="sm">
                Explorar prioridades
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </ButtonLink>
              <span className="inline-flex min-h-11 items-center gap-2 text-meta text-muted">
                <FileText aria-hidden="true" className="size-4 text-teal-ink" />
                {roadmapItems.length} itens em {roadmapPhases.length} frentes
              </span>
            </div>
          </div>

          <aside
            aria-labelledby="principles-title"
            className="min-w-0 rounded-[24px] border border-blue/20 bg-blue-soft/55 p-5 shadow-none sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-canvas text-blue-deep">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-meta font-bold uppercase tracking-[0.14em] text-blue-deep">
                  Como priorizamos
                </p>
                <h2
                  id="principles-title"
                  className="mt-1 text-[1.05rem] font-bold tracking-tight text-ink"
                >
                  Uma base de cada vez.
                </h2>
              </div>
            </div>
            <ol className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {principles.map(([number, label, detail]) => (
                <li
                  key={number}
                  className="flex min-w-0 items-start gap-3 rounded-[16px] border border-line/70 bg-white/60 p-3"
                >
                  <span className="font-mono text-[0.68rem] font-bold text-blue-deep">
                    {number}
                  </span>
                  <span className="min-w-0 text-[0.8rem] leading-tight text-ink">
                    <strong className="font-bold">{label}</strong>
                    <span className="block text-muted">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section
          aria-label="Resumo do roadmap"
          className="mt-8 grid gap-3 border-y border-line/80 py-4 sm:grid-cols-3 sm:gap-5"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-teal-ink"
            />
            <p className="text-meta leading-relaxed text-muted">
              <strong className="text-ink">Agora:</strong> segurança,
              acessibilidade e clareza.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Sparkles
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-accent"
            />
            <p className="text-meta leading-relaxed text-muted">
              <strong className="text-ink">Depois:</strong> cuidado estruturado
              e rede real.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <PawPrint
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-blue"
            />
            <p className="text-meta leading-relaxed text-muted">
              <strong className="text-ink">Sempre:</strong> uma experiência
              calma e honesta.
            </p>
          </div>
        </section>

        <section
          id="roadmap"
          className="mt-10 grid min-w-0 gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12"
        >
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-meta font-bold uppercase tracking-[0.14em] text-muted">
                Nesta página
              </p>
              <span className="font-mono text-[0.68rem] text-muted">
                {roadmapItems.length} itens
              </span>
            </div>
            <nav aria-label="Frentes do roadmap">
              <ol className="grid gap-1">
                {roadmapPhases.map((phase, index) => (
                  <li key={phase.id}>
                    <a
                      href={`#${phase.id}`}
                      className="group flex min-h-11 items-center gap-3 rounded-2xl px-3 text-meta font-semibold text-muted transition-colors hover:bg-white hover:text-ink"
                    >
                      <span className="font-mono text-[0.68rem] text-blue group-hover:text-blue-deep">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">{phase.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="mt-6 border-t border-line/80 pt-5">
              <p className="text-meta font-bold text-ink">Como ler</p>
              <p className="mt-1 text-meta leading-relaxed text-muted">
                Cada item tem um estado atual e uma definição expandível. A
                ordem de confiança continua sendo a bússola.
              </p>
            </div>
          </aside>

          <div className="min-w-0 space-y-9">
            {roadmapPhases.map((phase, phaseIndex) => (
              <PhaseSection
                key={phase.id}
                phase={phase}
                startNumber={
                  1 +
                  roadmapPhases
                    .slice(0, phaseIndex)
                    .reduce(
                      (total, previousPhase) =>
                        total + itemsForPhase(previousPhase.id).length,
                      0,
                    )
                }
              />
            ))}
          </div>
        </section>

        <footer className="mt-12 flex flex-col gap-3 border-t border-line/80 pt-5 text-meta text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Roadmap vivo. Priorização pode mudar conforme aprendemos com quem
            cuida.
          </p>
          <Link
            href="/welcome"
            className="inline-flex min-h-11 items-center gap-1.5 font-bold text-teal-ink hover:text-teal-deep"
          >
            Conhecer o PetHub
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </footer>
      </div>
    </main>
  );
}
