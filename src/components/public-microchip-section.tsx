"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, HelpCircle, Search, ShieldCheck } from "lucide-react";
import { BRAZIL_MICROCHIP_DATABASES, formatMicrochip, normalizeMicrochip } from "@/lib/domain/microchip";

export function PublicMicrochipSection({
  microchip,
  petName,
}: {
  microchip?: string | null;
  petName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const rawChip = normalizeMicrochip(microchip);
  const formattedChip = formatMicrochip(microchip);

  const handleCopy = async () => {
    if (!rawChip) return;
    try {
      await navigator.clipboard.writeText(rawChip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 rounded-2xl border border-line bg-surface/50 p-4 text-left">
      {microchip ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Microchip de Identificação
            </span>
            <span className="rounded bg-mint px-2 py-0.5 text-xs font-bold text-teal-ink">
              Padrão ISO
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <code className="font-mono text-base font-bold text-ink tracking-wider">
              {formattedChip}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink shadow-2xs hover:bg-surface"
            >
              {copied ? (
                <>
                  <Check aria-hidden="true" className="size-3 text-teal-ink" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" className="size-3" />
                  Copiar
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-line/60 pt-2.5">
        <button
          type="button"
          onClick={() => setGuideOpen((open) => !open)}
          className="flex items-center justify-between text-xs font-bold text-teal-ink hover:underline"
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle aria-hidden="true" className="size-3.5" />
            Guia de Consulta em Bancos de Microchip
          </span>
          <span>{guideOpen ? "Recolher" : "Ver onde consultar"}</span>
        </button>

        {guideOpen && (
          <div className="flex flex-col gap-2.5 pt-1 text-xs text-ink-soft">
            <p className="leading-relaxed">
              Leve o pet a qualquer clínica veterinária ou CCZ para leitura gratuita com leitor universal.
              Em seguida, consulte o código nos bancos brasileiros:
            </p>

            <div className="flex flex-col gap-2">
              {BRAZIL_MICROCHIP_DATABASES.map((db) => {
                const targetUrl =
                  rawChip && db.searchUrl ? db.searchUrl(rawChip) : db.url;

                return (
                  <div
                    key={db.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-paper p-2.5 border border-line/60"
                  >
                    <div>
                      <strong className="text-ink">{db.name}</strong>
                      <p className="text-caption text-muted line-clamp-1">
                        {db.description}
                      </p>
                    </div>
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-teal-ink px-2.5 py-1 text-caption font-semibold text-white hover:bg-teal-deep"
                    >
                      <Search aria-hidden="true" className="size-3" />
                      Consultar
                      <ExternalLink aria-hidden="true" className="size-2.5 opacity-70" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
