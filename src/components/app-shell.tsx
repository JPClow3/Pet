"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Compass,
  House,
  PawPrint,
  UserRound,
  CalendarHeart,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { unreadCount } from "@/lib/domain/notifications";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-provider";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Hoje",
    icon: House,
    active: "bg-sun-soft text-ink",
    marker: "bg-sun text-ink",
  },
  {
    href: "/reminders",
    label: "Cuidados",
    icon: CalendarHeart,
    active: "bg-mint text-teal-ink",
    marker: "bg-mint text-teal-ink",
  },
  {
    href: "/explore",
    label: "Descobrir",
    icon: Compass,
    active: "bg-blue-soft text-blue-deep",
    marker: "bg-blue-soft text-blue-deep",
  },
  {
    href: "/profile",
    label: "Perfil",
    icon: UserRound,
    active: "bg-accent-soft text-accent-deep",
    marker: "bg-accent-soft text-accent-deep",
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/reminders")
    return ["/pets", "/reminders", "/record"].some((prefix) =>
      pathname.startsWith(prefix),
    );
  if (href === "/explore")
    return ["/explore", "/community", "/products"].some((prefix) =>
      pathname.startsWith(prefix),
    );
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/" className="flex min-h-12 items-center gap-2.5">
      <span className="relative flex size-10 rotate-[-3deg] items-center justify-center rounded-[13px] bg-blue text-white shadow-[3px_3px_0_var(--color-sun)]">
        <PawPrint aria-hidden="true" className="size-5" />
      </span>
      <span className="text-xl font-extrabold tracking-[-0.04em] text-ink">
        pet<span className="text-blue">hub</span>
        <span className="text-accent">.</span>
      </span>
    </Link>
  );
}

function NotificationBell() {
  const notifications = useAppStore((state) => state.notifications);
  const unread = useMemo(
    () => unreadCount(notifications.filter((item) => !item.dismissed)),
    [notifications],
  );

  return (
    <Link
      href="/notifications"
      aria-label={
        unread > 0 ? `Notificações, ${unread} não lidas` : "Notificações"
      }
      className="relative flex size-12 items-center justify-center rounded-full border border-line/70 bg-white text-ink hover:bg-surface"
    >
      <Bell aria-hidden="true" className="size-5" />
      {unread > 0 ? (
        <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-danger-ink px-1 text-[0.65rem] font-semibold leading-4 text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lostPets = useAppStore((state) => state.pets).filter(
    (pet) => pet.lostMode.active,
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[5.5rem_1fr] lg:grid-cols-[14.5rem_1fr]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-teal-ink p-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Ir para o conteúdo
      </a>
      <aside className="sticky top-0 hidden h-dvh border-r border-line/70 bg-white px-3 py-7 md:flex md:flex-col md:gap-2 lg:px-5">
        <div className="mb-10 overflow-hidden px-1 max-lg:[&_a>span:nth-child(2)]:hidden">
          <Brand />
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-13 items-center justify-center gap-3 rounded-2xl px-3 text-[0.95rem] font-semibold transition-colors lg:justify-start",
                active ? item.active : "text-ink-soft hover:bg-surface",
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span className="sr-only lg:not-sr-only">{item.label}</span>
            </Link>
          );
        })}
        <div className="mt-auto hidden rotate-[-1deg] rounded-[18px] border-2 border-ink/10 bg-sun-soft p-4 shadow-[4px_4px_0_var(--color-ink)] lg:block">
          <ShieldCheck className="mb-3 size-5 text-blue" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink">
            Um cuidado de cada vez.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            A história do seu pet, sempre por perto.
          </p>
          <Link
            href="/profile"
            className="mt-2 flex min-h-11 items-center gap-2 text-xs font-bold text-blue-deep"
          >
            Seus dados e privacidade <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-20 border-b border-line/60 bg-canvas">
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
            <div className="md:hidden">
              <Brand />
            </div>
            <p className="hidden text-sm text-muted md:block">
              O cuidado de hoje.{" "}
              <span className="font-medium text-ink">A história inteira.</span>
            </p>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
        </header>

        {lostPets.length > 0 && (
          <div
            role="status"
            className="border-b border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger-ink sm:px-6 lg:px-10"
          >
            {lostPets.map((pet) => (
              <Link
                key={pet.id}
                href={`/pets/${pet.id}/card`}
                className="flex min-h-11 items-center justify-between gap-3 font-semibold"
              >
                Modo perdido ativo para {pet.name}
                <span className="underline">Ver carteirinha</span>
              </Link>
            ))}
          </div>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1200px] min-w-0 flex-1 px-4 pb-32 pt-6 outline-none sm:px-6 md:pb-12 lg:px-10 lg:pt-9"
        >
          {children}
        </main>

        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 shadow-[0_-8px_24px_rgb(23_33_58/0.06)] backdrop-blur safe-bottom md:hidden"
        >
          <ul className="mx-auto flex w-full max-w-lg items-stretch justify-between px-2 pt-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-[0.7rem] font-semibold transition-colors",
                      active ? "text-ink" : "text-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,transform]",
                        active && `${item.marker} -translate-y-0.5`,
                      )}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
