"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  Phone,
  Printer,
  Siren,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { BottomSheet } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import {
  createLostPosterPng,
  downloadLostPoster,
  lostPosterFileName,
  openPrintableLostPoster,
  type LostPosterArtworkFormat,
} from "@/lib/lost-poster-export";
import { generateLostPosterHtml } from "@/lib/domain/lost-poster";
import type { Pet } from "@/lib/domain/schema";

export function LostPetPosterModal({
  pet,
  publicUrl,
  open,
  onClose,
  onSaveLostDetails,
}: {
  pet: Pet;
  publicUrl: string | null;
  open: boolean;
  onClose: () => void;
  onSaveLostDetails?: (details: {
    neighborhood: string;
    contactPhone: string;
    reward: string;
    note: string;
  }) => Promise<void>;
}) {
  const [neighborhood, setNeighborhood] = useState(
    pet.lostMode.neighborhood ?? "",
  );
  const [contactPhone, setContactPhone] = useState(
    pet.lostMode.contactPhone ?? pet.card.contact ?? "",
  );
  const [reward, setReward] = useState(pet.lostMode.reward ?? "");
  const [note, setNote] = useState(
    pet.lostMode.note ??
      "Muito dócil e assustado. Por favor, se viu ou acolheu, avise imediatamente!",
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const getPosterInput = (format: LostPosterArtworkFormat = "a4") => ({
    pet,
    photo: pet.photo,
    publicUrl,
    neighborhood: neighborhood.trim() || null,
    city: null,
    contactPhone: contactPhone.trim() || null,
    reward: reward.trim() || null,
    since: pet.lostMode.since,
    note: note.trim() || null,
    format,
  });

  const handlePrintA4 = async () => {
    try {
      if (onSaveLostDetails) {
        await onSaveLostDetails({ neighborhood, contactPhone, reward, note });
      }
      const html = generateLostPosterHtml(getPosterInput("a4"));
      openPrintableLostPoster(html);
      toast.success("Visualização para impressão aberta", {
        description:
          "Use a opção de imprimir do navegador para imprimir em papel A4 ou salvar como PDF.",
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível abrir o cartaz para impressão.",
      );
    }
  };

  const handleDownloadPng = async (format: LostPosterArtworkFormat = "a4") => {
    setIsGenerating(true);
    try {
      if (onSaveLostDetails) {
        await onSaveLostDetails({ neighborhood, contactPhone, reward, note });
      }
      const blob = await createLostPosterPng(getPosterInput(format));
      downloadLostPoster(blob, lostPosterFileName(pet.name, format));
      toast.success("Cartaz baixado com sucesso!", {
        description:
          format === "a4"
            ? "Imagem A4 pronta para impressão em gráfica ou em casa."
            : "Imagem pronta para envio no WhatsApp e redes sociais.",
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao gerar arquivo de imagem do cartaz.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Gerador de Cartaz de Pet Perdido"
      description={`Crie um cartaz A4 pronto para impressão e WhatsApp de ${pet.name}.`}
    >
      <div className="flex flex-col gap-5 pb-6">
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
          <div className="flex items-center gap-2 text-danger-ink">
            <Siren aria-hidden="true" className="size-5 shrink-0" />
            <span className="font-bold">Modo Perdido Ativo</span>
          </div>
          <p className="mt-1 text-meta leading-relaxed text-danger-ink/90">
            O cartaz incluirá foto grande, nome em destaque, seus contatos e o
            QR Code com link direto para a carteirinha pública de {pet.name}.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Bairro onde desapareceu"
            htmlFor="lost-neighborhood"
            hint="Ex.: Pinheiros, Copacabana"
          >
            <div className="relative">
              <Input
                id="lost-neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Nome do bairro ou ponto de referência"
              />
            </div>
          </Field>

          <Field
            label="Telefone de contato"
            htmlFor="lost-phone"
            hint="Aparecerá em letras grandes no cartaz"
          >
            <Input
              id="lost-phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="(11) 98765-4321"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Recompensa (opcional)"
            htmlFor="lost-reward"
            hint="Ex.: R$ 500,00 ou Recompensa-se"
          >
            <Input
              id="lost-reward"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="Ex.: R$ 1.000,00"
            />
          </Field>

          <div className="flex flex-col justify-end">
            <p className="text-meta leading-relaxed text-muted">
              {publicUrl ? (
                <span className="font-medium text-teal-ink">
                  ✓ QR Code configurado com a carteirinha gerenciada.
                </span>
              ) : (
                <span className="text-warning-ink">
                  Aviso: publique um link gerenciado para que o QR Code leve à
                  página online.
                </span>
              )}
            </p>
          </div>
        </div>

        <Field
          label="Mensagem de alerta / Características"
          htmlFor="lost-note"
          hint="Características que facilitam identificar ou orientações de aproximação"
        >
          <Textarea
            id="lost-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: É dócil mas tem medo de barulhos altos. Mancando da pata traseira."
          />
        </Field>

        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            size="lg"
            variant="danger"
            onClick={handlePrintA4}
            disabled={isGenerating}
            className="w-full gap-2 text-base font-bold shadow-sm"
          >
            <Printer aria-hidden="true" className="size-5" />
            Imprimir Cartaz A4 / Salvar como PDF
          </Button>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant="secondary"
              onClick={() => handleDownloadPng("a4")}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Download aria-hidden="true" className="size-4" />
              )}
              Baixar cartaz para imprimir
            </Button>

            <Button
              variant="secondary"
              onClick={() => handleDownloadPng("square")}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <ImageIcon aria-hidden="true" className="size-4" />
              )}
              Baixar para WhatsApp (Feed)
            </Button>
          </div>
        </div>

        <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
          Voltar
        </Button>
      </div>
    </BottomSheet>
  );
}
