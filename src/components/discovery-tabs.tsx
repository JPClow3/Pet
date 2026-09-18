"use client";

import Link from "next/link";

export type DiscoveryTabId = "locais" | "comunidade" | "produtos";

const TABS = [
  {
    id: "locais" as const,
    label: "Locais",
    href: "/explore",
    hint: "Encontrar lugares",
  },
  {
    id: "comunidade" as const,
    label: "Comunidade",
    href: "/community",
    hint: "Trocar experiências",
  },
  {
    id: "produtos" as const,
    label: "Produtos",
    href: "/products",
    hint: "Ver parceiros",
  },
];

export function DiscoveryTabs({ active }: { active: DiscoveryTabId }) {
  return (
    <nav
      aria-label="Seções de Descobrir"
      className="flex overflow-x-auto rounded-2xl border border-line bg-surface/70 p-1 no-scrollbar"
    >
      {TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-ink focus-visible:ring-offset-2 ${
              selected
                ? "bg-white font-bold text-teal-ink shadow-sm"
                : "text-muted hover:bg-white/70 hover:text-ink"
            }`}
          >
            <span className="text-[0.82rem] font-semibold">{tab.label}</span>
            <span className="hidden text-[0.65rem] leading-4 opacity-80 sm:block">
              {tab.hint}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
