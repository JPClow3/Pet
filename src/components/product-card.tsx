"use client";

import { MapPin, PackageOpen, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import type { Recommendation } from "@/lib/domain/products";

const categoryMeta: Record<
  Recommendation["product"]["category"],
  { label: string; className: string }
> = {
  alimentacao: { label: "Alimentação", className: "bg-sun-soft border-l-sun" },
  higiene: { label: "Higiene", className: "bg-lime-soft border-l-teal" },
  passeio: { label: "Passeio", className: "bg-blue-soft border-l-blue" },
  saude: { label: "Saúde", className: "bg-violet-soft border-l-violet" },
  enriquecimento: {
    label: "Enriquecimento",
    className: "bg-accent-soft border-l-accent",
  },
};

export function ProductCard({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  const { product, reasons, partnerDistanceKm } = recommendation;
  const meta = categoryMeta[product.category];

  return (
    <Card className="overflow-hidden p-0 shadow-none border border-line/80 transition-colors duration-150 hover:border-teal/40">
      <div
        className={`relative flex min-h-32 items-end overflow-hidden border-l-[6px] ${meta.className} p-4`}
      >
        <span className="relative flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-paper/90 text-ink shadow-sm">
          <PackageOpen aria-hidden="true" className="size-6" />
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-paper/80 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-ink-soft/80">
          {meta.label}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <p className="text-meta font-semibold text-warning-ink">
          Produto de demonstração
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[1.08rem] font-semibold leading-tight text-ink">
              {product.name}
            </h3>
            <p className="mt-1 text-meta text-muted">{product.brand}</p>
          </div>
          <Chip tone="warning">
            Preço ilustrativo · R${" "}
            {product.priceBRL.toFixed(2).replace(".", ",")}
          </Chip>
        </div>

        <p className="text-[0.92rem] leading-relaxed text-ink-soft/90">
          {product.description}
        </p>

        <div className="border-l-2 border-teal bg-lime-soft px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-teal-deep">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Por que apareceu
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {reasons.slice(0, 3).map((reason) => (
              <li
                key={reason}
                className="text-meta leading-relaxed text-ink-soft/85"
              >
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {partnerDistanceKm !== null ? (
          <p className="flex items-center gap-1.5 text-meta text-muted">
            <MapPin aria-hidden="true" className="size-3.5 text-blue" />
            Distância ilustrativa: {partnerDistanceKm} km
          </p>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-line/70 pt-3">
          <p className="text-meta font-semibold text-ink">
            Compra indisponível nesta prévia
          </p>
          <p className="text-meta leading-relaxed text-muted">
            Produto, marca, parceiro e preço são exemplos. Não há oferta real ou
            link de compra verificado.
          </p>
        </div>
      </div>
    </Card>
  );
}
