"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  HelpCircle,
  QrCode,
  Search,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { BottomSheet } from "@/components/ui/sheet";
import {
  BRAZIL_MICROCHIP_DATABASES,
  formatMicrochip,
  isValidIsoMicrochip,
  MICROCHIP_GUIDE_STEPS,
  normalizeMicrochip,
} from "@/lib/domain/microchip";

export function MicrochipGuideModal({
  microchip,
  petName,
  open: controlledOpen,
  onClose: controlledOnClose,
  triggerLabel = "Guia de Microchip Nacional",
}: {
  microchip?: string | null;
  petName?: string | null;
  open?: boolean;
  onClose?: () => void;
  triggerLabel?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const handleClose = () => {
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setInternalOpen(false);
    }
  };

  const rawChip = normalizeMicrochip(microchip);
  const formattedChip = formatMicrochip(microchip);
  const isValid = isValidIsoMicrochip(microchip);

  const handleCopy = async () => {
    if (!rawChip) return;
    try {
      await navigator.clipboard.writeText(rawChip);
      setCopied(true);
      toast.success("Número do microchip copiado!", {
        description: `${rawChip} está na área de transferência.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o microchip.");
    }
  };

  return (
    <>
      {!isControlled && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setInternalOpen(true)}
          className="inline-flex items-center gap-1.5"
        >
          <HelpCircle aria-hidden="true" className="size-4 text-teal-ink" />
          {triggerLabel}
        </Button>
      )}

      <BottomSheet
        open={open}
        onClose={handleClose}
        title="Guia de Microchip Nacional"
        description="Como consultar e localizar tutores nos principais bancos de dados do Brasil."
      >
        <div className="flex flex-col gap-5 pb-6">
          {microchip ? (
            <div className="rounded-2xl border border-teal-ink/20 bg-mint/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-meta font-semibold uppercase tracking-wider text-teal-ink">
                  Microchip de {petName ?? "deste pet"}
                </span>
                <Chip tone={isValid ? "teal" : "muted"}>
                  {isValid ? "Padrão ISO 15 dígitos" : "Formato livre"}
                </Chip>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xl font-bold tracking-wider text-ink">
                  {formattedChip}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check aria-hidden="true" className="size-4 text-teal-ink" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy aria-hidden="true" className="size-4" />
                      Copiar número
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          {/* Bancos de dados */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-soft">
              Onde consultar no Brasil
            </h3>
            <p className="text-meta leading-relaxed text-muted">
              No Brasil não há um cartório único obrigatório. Por isso, ao
              encontrar um pet, recomendamos verificar nos principais bancos
              abaixo:
            </p>

            <div className="flex flex-col gap-2.5">
              {BRAZIL_MICROCHIP_DATABASES.map((db) => {
                const targetUrl =
                  rawChip && db.searchUrl ? db.searchUrl(rawChip) : db.url;

                return (
                  <Card
                    key={db.id}
                    className="flex flex-col justify-between gap-2.5 border-line/70 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{db.name}</span>
                        <span className="text-meta text-muted">
                          ({db.fullName})
                        </span>
                      </div>
                      <p className="mt-1 text-meta leading-relaxed text-ink-soft">
                        {db.description}
                      </p>
                    </div>

                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-teal-ink px-4 text-[0.85rem] font-semibold text-white transition-colors hover:bg-teal-deep"
                    >
                      <Search aria-hidden="true" className="size-3.5" />
                      Consultar
                      <ExternalLink aria-hidden="true" className="size-3.5 opacity-70" />
                    </a>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Instruções passo a passo */}
          <div className="flex flex-col gap-3 rounded-2xl bg-surface/80 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <ShieldAlert aria-hidden="true" className="size-4 text-warning-ink" />
              Instruções para quem encontrou o pet
            </h3>

            <div className="flex flex-col gap-3 text-[0.875rem]">
              {MICROCHIP_GUIDE_STEPS.map((step, idx) => (
                <div key={idx} className="flex flex-col gap-0.5">
                  <span className="font-bold text-ink">{step.title}</span>
                  <span className="text-muted leading-relaxed">
                    {step.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button variant="ghost" onClick={handleClose}>
            Fechar guia
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
