import Link from "next/link";
import type { ReactNode } from "react";

import type { Pet } from "@/lib/domain/schema";
import { cn } from "@/lib/utils";

type CareTab = "perfil" | "agenda" | "historico" | "diario";

const tabLabels: Record<CareTab, string> = {
  perfil: "Perfil",
  agenda: "Agenda",
  historico: "Histórico",
  diario: "Diário",
};

/**
 * One header for every care tab, so the pet context, the section title, the
 * section's single primary action and the tabs never move between screens.
 * The H1 is the tab name; there is no back control inside the tabbed area.
 */
export function CareHeader({
  active,
  pet,
  context,
  action,
}: {
  active: CareTab;
  pet?: Pick<Pet, "id"> | null;
  context: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex min-h-11 items-center">{context}</div>
      <div className="flex min-h-11 flex-wrap items-end justify-between gap-3">
        <h1 className="font-editorial text-h1 font-semibold leading-none tracking-tight text-ink">
          {tabLabels[active]}
        </h1>
        {action}
      </div>
      <CareTabs active={active} pet={pet} className="mt-1" />
    </header>
  );
}

/**
 * A predictable, link-backed sub-navigation for the trusted care surfaces.
 * Every tab is scoped to the active pet; Agenda opens on that pet too.
 */
export function CareTabs({
  active,
  pet,
  className,
}: {
  active?: CareTab | null;
  pet?: Pick<Pet, "id"> | null;
  className?: string;
}) {
  const tabs = [
    { key: "perfil" as const, href: "/pets" },
    { key: "agenda" as const, href: "/reminders" },
    {
      key: "historico" as const,
      href: pet ? `/pets/${pet.id}/health` : "/pets",
    },
    { key: "diario" as const, href: pet ? `/pets/${pet.id}/diary` : "/pets" },
  ];

  return (
    <nav
      aria-label="Seções de cuidados"
      className={cn(
        "overflow-x-auto no-scrollbar border-b border-line/80",
        className,
      )}
    >
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-12 items-center border-b-2 px-3 text-label font-semibold transition-colors",
                  selected
                    ? "border-teal-ink text-teal-ink"
                    : "border-transparent text-muted hover:border-line hover:text-ink",
                )}
              >
                {tabLabels[tab.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
