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
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-20 top-[12%] h-40 w-48 rotate-[-8deg] rounded-[3rem] bg-sun/75" />
        <div className="absolute -right-20 top-[34%] h-64 w-44 rotate-[11deg] rounded-[3rem] bg-blue-soft" />
        <div className="absolute bottom-[-5rem] left-[38%] size-44 rotate-12 rounded-[2.5rem] bg-accent-soft" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-8 pt-5 sm:px-8 lg:px-12 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/welcome"
            aria-label="PetHub, início"
            className="group inline-flex min-h-11 items-center gap-2 rounded-full text-ink transition-opacity hover:opacity-80"
          >
            <span className="flex size-9 rotate-[-3deg] items-center justify-center rounded-[12px] bg-blue text-white shadow-[3px_3px_0_var(--color-sun)]">
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
            <p className="mb-5 inline-flex rotate-[-1deg] items-center gap-2 rounded-md bg-sun px-3 py-1 text-meta font-extrabold uppercase tracking-[0.13em] text-ink">
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
                className="group w-full shadow-[4px_4px_0_var(--color-ink)] sm:w-auto"
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
            <div className="relative overflow-hidden rounded-[2rem_2rem_3.5rem_2rem] border-2 border-ink/10 bg-blue p-5 text-white shadow-[8px_8px_0_var(--color-accent)] sm:p-7">
              <div
                className="absolute -right-14 -top-16 size-44 rotate-12 rounded-[2.5rem] bg-sun"
                aria-hidden="true"
              />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-meta font-medium text-white/70">
                    Seu espaço de cuidado
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-white">
                    Começa simples.
                  </p>
                </div>
                <span className="relative flex size-10 items-center justify-center rounded-2xl bg-sun text-ink">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                </span>
              </div>

              <div className="relative mx-auto my-10 flex size-52 rotate-[-3deg] items-center justify-center rounded-[4.25rem_2rem_4.25rem_2rem] bg-accent">
                <div
                  className="absolute inset-3 rounded-[3.6rem_1.5rem_3.6rem_1.5rem] border-2 border-white/70"
                  aria-hidden="true"
                />
                <span className="relative flex size-24 rotate-[3deg] items-center justify-center rounded-[2rem] bg-white text-blue shadow-[5px_5px_0_var(--color-sun)]">
                  <PawPrint
                    aria-hidden="true"
                    className="size-10"
                    strokeWidth={1.6}
                  />
                </span>
                <span className="absolute bottom-4 rotate-[3deg] rounded-md bg-lime px-3 py-1 text-meta font-bold text-ink shadow-card">
                  Tudo no seu ritmo
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-sun p-3">
                  <p className="text-meta text-ink/70">Hoje</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    Próximo cuidado
                  </p>
                </div>
                <div className="rounded-2xl bg-lime p-3">
                  <p className="text-meta text-ink/70">História</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
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
