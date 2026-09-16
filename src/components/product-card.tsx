"use client";

import { ExternalLink, MapPin, PackageOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import type { Recommendation } from "@/lib/domain/products";
import { useAppStore } from "@/lib/store/app-store";

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
  const track = useAppStore((state) => state.track);
  const meta = categoryMeta[product.category];

  return (
    <Card className="overflow-hidden p-0 shadow-[0_6px_20px_rgb(23_50_77/0.06)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgb(23_50_77/0.11)]">
      <div
        className={`relative flex min-h-32 items-end overflow-hidden border-l-[6px] ${meta.className} p-4`}
      >
        <span className="relative flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-ink shadow-sm">
          <PackageOpen aria-hidden="true" className="size-6" />
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-white/80 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-ink-soft/80">
          {meta.label}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[1.08rem] font-semibold leading-tight text-ink">
              {product.name}
            </h3>
            <p className="mt-1 text-meta text-muted">{product.brand}</p>
          </div>
          <Chip tone="warning">
            R$ {product.priceBRL.toFixed(2).replace(".", ",")}
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
            Parceiro listado a {partnerDistanceKm} km estimados
          </p>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-line/70 pt-3">
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              track("partner_click", {
                productId: product.id,
                partner: product.partnerName,
              });
              toast("Abrindo o site do parceiro", {
                description: "Você sairá do PetHub para continuar a compra.",
              });
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-blue px-4 text-[0.9rem] font-semibold text-white transition-colors hover:bg-blue-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
          >
            Ver no parceiro {product.partnerName}
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
          <p className="text-[0.7rem] leading-relaxed text-muted">
            Parceiro externo. Preço, estoque e entrega podem mudar no site de
            destino; o PetHub pode receber comissão.
          </p>
        </div>
      </div>
    </Card>
  );
}
