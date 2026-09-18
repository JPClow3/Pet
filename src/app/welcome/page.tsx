"use client";

import {
  ArrowUpRight,
  Check,
  LockKeyhole,
  PawPrint,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { ButtonLink } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

const promises = [
  "Veja o que precisa de atenção hoje",
  "Guarde saúde, rotina e memórias",
  "Compartilhe só o que você escolher",
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
    useAppStore.getState().track("onboarding_started");
  }, []);

  return (
    <main className="relative isolate flex min-h-dvh overflow-hidden bg-canvas">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-50"
      >
        <div className="absolute -left-24 -top-24 size-96 rounded-full bg-sun-soft/60 blur-3xl" />
        <div className="absolute -right-24 top-1/3 size-96 rounded-full bg-blue-soft/60 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-8 pt-5 sm:px-8 lg:px-12 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/welcome"
            aria-label="PetHub, início"
            className="group inline-flex min-h-11 items-center gap-2 rounded-full text-ink transition-opacity hover:opacity-80"
          >
            <span className="flex size-9 items-center justify-center rounded-[12px] bg-blue text-white">
              <PawPrint aria-hidden="true" className="size-4" />
            </span>
            <span className="font-semibold tracking-tight">PetHub</span>
          </Link>

          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-blue/20 bg-blue-soft px-3 text-meta font-semibold text-blue-deep">
            <LockKeyhole aria-hidden="true" className="size-3.5" />
            Privado por padrão
          </span>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:gap-20 lg:py-16">
          <section className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-sun-soft px-3.5 py-1 text-meta font-bold text-warning-ink">
              <span
                className="size-2 rounded-full bg-accent"
                aria-hidden="true"
              />
              Cuidado que acompanha a vida
            </p>
            <h1 className="max-w-[14ch] font-editorial text-[clamp(2.55rem,11vw,5rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-ink">
              O cuidado de hoje. A história inteira do seu pet.
            </h1>
            <p className="mt-6 max-w-[38rem] text-[1.05rem] leading-relaxed text-ink-soft sm:text-xl sm:leading-relaxed">
              Um espaço calmo para organizar a rotina, registrar o que aconteceu
              e encontrar a informação certa quando você precisar.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink
                href="/onboarding"
                variant="blue"
                size="lg"
                className="group w-full sm:w-auto"
              >
                Criar meu espaço
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </ButtonLink>
              <span className="text-center text-meta text-muted sm:text-left">
                Leva menos de 90 segundos
              </span>
            </div>

            <ul
              className="mt-9 grid gap-3 sm:grid-cols-3 sm:gap-5"
              aria-label="O que você encontra"
            >
              {promises.map((promise) => (
                <li
                  key={promise}
                  className="flex items-start gap-2 text-meta leading-relaxed text-ink-soft"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-lime text-ink">
                    <Check
                      aria-hidden="true"
                      className="size-3"
                      strokeWidth={2.5}
                    />
                  </span>
                  {promise}
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-label="Prévia do cuidado"
            className="relative mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end"
          >
            <div className="relative overflow-hidden rounded-[28px] border border-blue-deep/30 bg-blue p-5 text-white shadow-soft sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-meta font-medium text-white/75">
                    Seu espaço de cuidado
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-white">
                    Começa simples.
                  </p>
                </div>
                <span className="relative flex size-10 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-xs">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                </span>
              </div>

              <div className="relative mx-auto my-8 flex size-44 items-center justify-center rounded-3xl border border-white/20 bg-blue-deep/40">
                <span className="flex size-24 items-center justify-center rounded-2xl bg-white text-blue shadow-soft">
                  <PawPrint
                    aria-hidden="true"
                    className="size-10"
                    strokeWidth={1.6}
                  />
                </span>
                <span className="absolute -bottom-2 rounded-full bg-sun px-3 py-0.5 text-meta font-bold text-ink shadow-sm">
                  Tudo no seu ritmo
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-xs">
                  <p className="text-meta text-white/75">Hoje</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Próximo cuidado
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-xs">
                  <p className="text-meta text-white/75">História</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    Sempre por perto
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-center text-meta text-muted">
              <ShieldCheck
                aria-hidden="true"
                className="size-4 text-teal-ink"
              />
              Você controla o que fica privado e o que é compartilhado.
            </p>
          </section>
        </div>

        <footer className="flex flex-col gap-2 border-t border-line/70 pt-5 text-meta text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Feito para a rotina real de quem cuida.</span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-full bg-teal-ink"
              aria-hidden="true"
            />
            Dados salvos neste aparelho
          </span>
        </footer>
      </div>
    </main>
  );
}
