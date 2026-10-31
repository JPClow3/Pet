"use client";

import Link from "next/link";

export type DiscoveryTabId = "locais" | "explorar" | "comunidade" | "produtos";

const TABS = [
  {
    id: "locais" as const,
    label: "Locais",
    href: "/explore",
    hint: "Clínicas 24h e confiança",
  },
  {
    id: "comunidade" as const,
    label: "Comunidade",
    href: "/community",
    hint: "Prévia de relatos",
  },
  {
    id: "produtos" as const,
    label: "Produtos",
    href: "/products",
    hint: "Ver parceiros",
  },
];

export function DiscoveryTabs({ active }: { active: DiscoveryTabId }) {
  const normalizedActive = active === "explorar" ? "locais" : active;
  return (
    <nav
      aria-label="Seções de Descobrir"
      className="flex overflow-x-auto rounded-2xl border border-line bg-surface/70 p-1 no-scrollbar"
    >
      {TABS.map((tab) => {
        const selected = normalizedActive === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink focus-visible:ring-offset-2 ${
              selected
                ? "bg-paper font-bold text-teal-ink shadow-sm"
                : "text-muted hover:bg-paper/70 hover:text-ink"
            }`}
          >
            <span className="text-label font-semibold">{tab.label}</span>
            <span className="hidden text-caption opacity-80 sm:block">
              {tab.hint}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
