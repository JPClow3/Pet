"use client";

import {
  ArrowUpRight,
  Check,
  FileHeart,
  History,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Brand, BrandMark } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

const promises = [
  "Saiba qual é o próximo cuidado",
  "Guarde documentos e momentos",
  "Escolha o que compartilhar",
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
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 pb-7 pt-5 sm:px-8 lg:px-12 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Brand href="/welcome" />
          <span className="inline-flex items-center gap-1.5 text-meta text-muted">
            <LockKeyhole
              aria-hidden="true"
              className="size-3.5 shrink-0 text-teal-ink"
            />
            Sem conta para começar
          </span>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-16 lg:py-16">
          <section>
            <p className="mb-5 flex items-center gap-2 text-meta font-semibold text-teal-ink">
              <span
                className="size-1.5 rounded-full bg-accent"
                aria-hidden="true"
              />
              Zelo para a vida que vocês dividem
            </p>
            <h1 className="max-w-[13ch] font-editorial text-[clamp(2.8rem,10.5vw,4.8rem)] font-medium leading-[1.04] tracking-[-0.045em] text-ink">
              O cuidado de hoje.{" "}
              <span className="text-blue">A história inteira</span> do seu pet.
            </h1>
            <p className="mt-6 max-w-[43ch] text-base leading-relaxed text-ink-soft sm:text-lg sm:leading-relaxed">
              Organize os cuidados, os documentos e os momentos que fazem parte
              da vida do seu pet. Tudo começa com vocês dois.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:items-start">
              <ButtonLink
                href="/onboarding"
                variant="brand"
                size="lg"
                className="group sm:w-auto"
              >
                Começar com meu pet
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-5 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </ButtonLink>
              <Link
                href="/account#restore-backup"
                className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-ink-soft underline decoration-line underline-offset-4 hover:text-blue sm:justify-start"
              >
                Já tenho um backup
              </Link>
            </div>
            <ul className="mt-6 space-y-3" aria-label="O que você encontra">
              {promises.map((promise) => (
                <li
                  key={promise}
                  className="flex items-center gap-2.5 text-sm text-ink-soft"
                >
                  <Check
                    aria-hidden="true"
                    className="size-4 shrink-0 text-teal-ink"
                    strokeWidth={2}
                  />
                  {promise}
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-label="Exemplo de organização na Zelupi"
            className="relative mx-auto w-full max-w-sm lg:justify-self-end"
          >
            <div
              aria-hidden="true"
              className="absolute -inset-x-4 inset-y-8 rounded-[44%_56%_48%_52%] bg-mint sm:-inset-x-7"
            />
            <div className="relative rotate-[-2deg] rounded-feature border border-line bg-paper p-5 shadow-card sm:p-7">
              <div className="flex items-center gap-3 border-b border-line pb-5">
                <BrandMark className="size-12" />
                <div>
                  <p className="font-editorial text-2xl font-medium text-ink">
                    Um dia de cada vez.
                  </p>
                  <p className="mt-1 text-xs text-muted">Exemplo ilustrativo</p>
                </div>
              </div>
              <div className="space-y-6 py-6">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-soft text-blue-deep">
                    <FileHeart aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-muted">
                      NA AGENDA
                    </p>
                    <p className="mt-1 font-semibold text-ink">
                      O próximo cuidado da Luna
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Uma data, um passo de cada vez.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-teal-ink">
                    <History aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-muted">
                      NA HISTÓRIA
                    </p>
                    <p className="mt-1 font-semibold text-ink">
                      O que vocês já viveram
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Saúde, documentos e memórias.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl bg-canvas p-3.5 text-sm leading-relaxed text-ink-soft">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-teal-ink"
                />
                Você escolhe o que fica privado e o que é compartilhado.
              </div>
            </div>
            <p className="relative mx-auto mt-6 w-fit rounded-full bg-accent-soft px-4 py-2 text-meta font-medium text-accent-ink">
              Pequenos cuidados. Uma vida inteira.
            </p>
          </section>
        </div>

        <footer className="flex flex-col gap-2 border-t border-line pt-5 text-meta text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Dados neste aparelho. Conta opcional.</span>
          <Link
            href="/roadmap"
            className="inline-flex min-h-11 items-center gap-1.5 font-medium text-ink-soft hover:text-blue"
          >
            O que estamos construindo{" "}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </footer>
      </div>
    </main>
  );
}
