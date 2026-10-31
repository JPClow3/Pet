"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

// Illustrative rows only: shows what the agenda looks like, not real data.
const sampleAgenda = [
  { care: "Vacina V10", pet: "Luna", date: "12 nov" },
  { care: "Vermífugo", pet: "Luna", date: "20 nov" },
  { care: "Antipulgas", pet: "Thor", date: "3 dez" },
];

export default function WelcomePage() {
  const router = useRouter();
  const ready = useHydrated();
  const hasTutor = useAppStore((state) => Boolean(state.tutor));
  const tracked = useRef(false);

  useEffect(() => {
    if (ready && hasTutor) router.replace("/");
  }, [ready, hasTutor, router]);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void useAppStore
      .getState()
      .track("onboarding_started")
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-dvh bg-canvas">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pb-7 pt-5 sm:px-8 lg:px-12 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Brand href="/welcome" />
          <span className="text-meta text-muted">Sem conta para começar</span>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:gap-16 lg:py-16">
          <section>
            <h1 className="max-w-[14ch] font-editorial text-[clamp(2.4rem,8.5vw,3.75rem)] font-medium leading-[1.08] tracking-[-0.03em] text-ink">
              O cuidado de hoje. A história inteira do seu pet.
            </h1>
            <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-ink-soft sm:text-lg sm:leading-relaxed">
              Vacinas, remédios, consultas, documentos e fotos do seu pet num
              lugar só, guardados neste aparelho.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-5">
              <ButtonLink href="/onboarding" variant="brand" size="lg">
                Começar com meu pet
                <ArrowRight aria-hidden="true" className="size-5" />
              </ButtonLink>
              <Link
                href="/account#restore-backup"
                className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-ink-soft underline decoration-line underline-offset-4 hover:text-blue"
              >
                Já tenho um backup
              </Link>
            </div>
          </section>

          <section aria-label="Exemplo da agenda na Zelupi">
            <div className="rounded-card border border-line bg-paper">
              <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
                <p className="text-label font-semibold text-ink">
                  Próximos cuidados
                </p>
                <p className="text-meta text-muted">Exemplo</p>
              </div>
              <ul className="divide-y divide-line">
                {sampleAgenda.map((row) => (
                  <li
                    key={`${row.care}-${row.pet}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{row.care}</p>
                      <p className="text-meta text-muted">{row.pet}</p>
                    </div>
                    <p className="shrink-0 text-label tabular-nums text-ink-soft">
                      {row.date}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 max-w-[44ch] text-label leading-relaxed text-muted">
              Ao registrar uma vacina ou um remédio, a próxima dose entra na
              agenda. Você escolhe o que fica privado e o que é compartilhado.
            </p>
          </section>
        </div>

        <footer className="flex flex-col gap-2 border-t border-line pt-5 text-meta text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Dados neste aparelho. Conta opcional.</span>
          <Link
            href="/roadmap"
            className="inline-flex min-h-11 items-center font-medium text-ink-soft underline decoration-line underline-offset-4 hover:text-blue"
          >
            O que estamos construindo
          </Link>
        </footer>
      </div>
    </main>
  );
}
