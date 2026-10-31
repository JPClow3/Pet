import Link from "next/link";

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
