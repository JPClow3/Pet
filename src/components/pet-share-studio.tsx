"use client";

import {
  CheckCircle2,
  Clipboard,
  Download,
  LoaderCircle,
  Share2,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  createPetCardPng,
  downloadPetCard,
  getPetCardCopy,
  PET_CARD_FORMATS,
  PET_CARD_THEMES,
  petCardFileName,
  type PetCardFormat,
  type PetCardTheme,
} from "@/lib/pet-card-export";
import type { PublicPetCard } from "@/lib/domain/schema";

type ActionStatus =
  | { state: "idle"; message: string }
  | { state: "generating"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string }
  | { state: "unavailable"; message: string };

type PreviewState = {
  state: "ready" | "error";
  url: string | null;
  format: PetCardFormat;
  theme: PetCardTheme;
  publicUrl: string;
  card: PublicPetCard;
  photo: string | null;
} | null;

const formatOrder: PetCardFormat[] = ["wallet", "square", "story"];
const themeOrder: PetCardTheme[] = ["coral", "ocean", "berry"];
const subscribeToNothing = () => () => {};

export function PetShareStudio({
  card,
  photo,
  publicUrl,
  onTrack,
}: {
  card: PublicPetCard;
  photo: string | null;
  publicUrl: string | null;
  onTrack?: (action: string) => void;
}) {
  const [format, setFormat] = useState<PetCardFormat>("wallet");
  const [theme, setTheme] = useState<PetCardTheme>("coral");
  const [preview, setPreview] = useState<PreviewState>(null);
  const [action, setAction] = useState<ActionStatus>({
    state: "idle",
    message: "Escolha um formato para baixar ou compartilhar.",
  });
  const shareSupported = useSyncExternalStore(
    subscribeToNothing,
    () => typeof navigator.share === "function",
    () => false,
  );
  const copy = useMemo(() => getPetCardCopy(card), [card]);
  const definition = PET_CARD_FORMATS[format];
  const selectedTheme = PET_CARD_THEMES[theme];
  const fileName = petCardFileName(card.name, format);
  const isBusy = action.state === "generating";

  useEffect(() => {
    if (!publicUrl) return;

    let cancelled = false;
    let previewUrl: string | null = null;
    void createPetCardPng({ card, photo, publicUrl, format, theme })
      .then((blob) => {
        if (cancelled) return;
        previewUrl = URL.createObjectURL(blob);
        setPreview({
          state: "ready",
          url: previewUrl,
          format,
          theme,
          publicUrl,
          card,
          photo,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPreview({
            state: "error",
            url: null,
            format,
            theme,
            publicUrl,
            card,
            photo,
          });
        }
      });

    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [card, format, photo, publicUrl, theme]);

  const currentPreview =
    preview &&
    publicUrl &&
    preview.format === format &&
    preview.theme === theme &&
    preview.publicUrl === publicUrl &&
    preview.card === card &&
    preview.photo === photo
      ? preview
      : null;

  const previewDescription = [
    `Preview da carteirinha de ${card.name}`,
    copy.identity,
    copy.location,
    copy.health,
    copy.lost,
    copy.contact ? "com contato autorizado" : "sem contato público",
    `formato ${definition.label}`,
    `paleta ${selectedTheme.label}`,
  ]
    .filter(Boolean)
    .join(", ");

  async function generateArtwork() {
    if (!publicUrl) throw new Error("A página pública ainda está carregando.");
    return createPetCardPng({ card, photo, publicUrl, format, theme });
  }

  async function handleDownload() {
    setAction({ state: "generating", message: "Gerando seu PNG…" });
    try {
      const blob = await generateArtwork();
      downloadPetCard(blob, fileName);
      onTrack?.("png_downloaded");
      setAction({
        state: "success",
        message: `PNG ${definition.label.toLowerCase()} baixado com sucesso.`,
      });
      toast.success("Carteirinha baixada", {
        description: "A imagem está pronta para publicar.",
      });
    } catch {
      setAction({
        state: "error",
        message: "Não foi possível gerar o PNG. Tente novamente.",
      });
      toast.error("Falha ao gerar a carteirinha");
    }
  }

  async function handleShare() {
    setAction({ state: "generating", message: "Preparando a imagem…" });
    let blob: Blob | null = null;
    try {
      blob = await generateArtwork();
      const file = new File([blob], fileName, { type: "image/png" });
      const canShareFile =
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (!canShareFile) {
        downloadPetCard(blob, fileName);
        onTrack?.("png_share_fallback");
        setAction({
          state: "unavailable",
          message:
            "Compartilhamento direto indisponível. Baixamos o PNG para você.",
        });
        toast("Imagem baixada", {
          description: "Seu navegador não oferece compartilhamento direto.",
        });
        return;
      }

      await navigator.share({
        title: `Carteirinha de ${card.name}`,
        text: `Carteirinha digital de ${card.name}, feita no PetHub.`,
        files: [file],
      });
      onTrack?.("png_shared");
      setAction({
        state: "success",
        message: "Carteirinha compartilhada com sucesso.",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setAction({ state: "idle", message: "Compartilhamento cancelado." });
        return;
      }
      if (blob) {
        downloadPetCard(blob, fileName);
        onTrack?.("png_share_fallback");
      }
      setAction({
        state: "error",
        message: blob
          ? "O menu de compartilhamento falhou. Baixamos o PNG para você."
          : "Não foi possível gerar a imagem. Tente novamente.",
      });
      toast.error("Não foi possível compartilhar");
    }
  }

  async function handleCopyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      onTrack?.("link_copied");
      setAction({ state: "success", message: "Link público copiado." });
      toast.success("Link copiado");
    } catch {
      setAction({
        state: "error",
        message: "Não foi possível copiar o link neste navegador.",
      });
    }
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-gradient-to-br from-blue-soft/70 via-canvas to-accent-soft/55 px-5 py-5">
          <p className="text-meta font-extrabold uppercase tracking-[0.16em] text-blue-deep">
            Estúdio da carteirinha
          </p>
          <CardTitle className="mt-1 font-editorial text-[1.55rem] font-semibold leading-tight">
            Pronta para guardar e compartilhar
          </CardTitle>
          <p className="mt-2 max-w-[50ch] text-[0.88rem] leading-relaxed text-muted">
            O preview abaixo é a imagem exata do PNG. Apenas os dados públicos
            autorizados entram na arte.
          </p>
        </div>

        <div className="flex flex-col gap-5 p-4 sm:p-5">
          <fieldset>
            <legend className="mb-2 text-meta font-bold uppercase tracking-[0.1em] text-muted">
              Formato
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {formatOrder.map((value) => {
                const option = PET_CARD_FORMATS[value];
                const checked = format === value;
                return (
                  <label
                    key={value}
                    className={`flex min-h-[4.35rem] cursor-pointer flex-col justify-center rounded-2xl border px-2.5 text-left transition-[border-color,background-color,box-shadow] ${
                      checked
                        ? "border-blue bg-blue-soft text-blue-deep shadow-[0_4px_14px_rgb(52_87_213/0.12)]"
                        : "border-line bg-white text-ink hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pet-card-format"
                      value={value}
                      checked={checked}
                      onChange={() => setFormat(value)}
                      className="sr-only"
                    />
                    <span className="text-meta font-bold">
                      {option.label}
                    </span>
                    <span className="mt-0.5 text-meta leading-snug opacity-75">
                      {option.hint}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-meta font-bold uppercase tracking-[0.1em] text-muted">
              Paleta
            </legend>
            <div className="flex flex-wrap gap-2">
              {themeOrder.map((value) => {
                const option = PET_CARD_THEMES[value];
                const checked = theme === value;
                return (
                  <label
                    key={value}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-meta font-bold transition-colors ${
                      checked
                        ? "border-blue bg-blue text-white"
                        : "border-line bg-white text-ink hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pet-card-theme"
                      value={value}
                      checked={checked}
                      onChange={() => setTheme(value)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="size-4 rounded-full border border-black/10"
                      style={{ backgroundColor: option.accent }}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <figure className="relative overflow-hidden rounded-[28px] border border-line bg-[radial-gradient(circle_at_top_right,var(--color-sun-soft),transparent_42%),linear-gradient(145deg,var(--color-surface),var(--color-canvas)))] p-3 sm:p-5">
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-canvas/90 px-2.5 py-1 text-meta font-bold uppercase tracking-[0.1em] text-ink-soft shadow-sm">
              Preview exato
            </span>
            <div
              className={`mx-auto flex min-h-64 w-full items-center justify-center pt-8 ${
                format === "wallet"
                  ? "max-w-[38rem]"
                  : format === "square"
                    ? "max-w-[31rem]"
                    : "max-w-[19rem]"
              }`}
            >
              {currentPreview?.state === "ready" && currentPreview.url ? (
                // Generated locally from the same PNG blob used by download/share.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPreview.url}
                  alt={previewDescription}
                  className="max-h-[38rem] w-full rounded-[18px] object-contain shadow-float"
                />
              ) : currentPreview?.state === "error" ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center text-danger-ink">
                  <TriangleAlert aria-hidden="true" className="size-6" />
                  <p className="max-w-[28ch] text-[0.85rem] font-semibold">
                    Não foi possível montar o preview. Tente outra vez.
                  </p>
                </div>
              ) : (
                <div
                  className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted"
                  role="status"
                >
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-7 animate-spin motion-reduce:animate-none"
                  />
                  <p className="text-meta font-semibold">
                    {publicUrl
                      ? "Montando o preview…"
                      : "Preparando o link público…"}
                  </p>
                </div>
              )}
            </div>
            <figcaption className="mt-3 text-center text-meta text-muted">
              {definition.width} × {definition.height} px · PNG em alta
              qualidade
            </figcaption>
          </figure>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={handleShare}
              disabled={!publicUrl || isBusy}
              className="w-full"
            >
              {isBusy ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Share2 aria-hidden="true" className="size-4" />
              )}
              Compartilhar imagem
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownload}
              disabled={!publicUrl || isBusy}
              className="w-full"
            >
              <Download aria-hidden="true" className="size-4" />
              Baixar PNG
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            disabled={!publicUrl || isBusy}
            className="w-full border border-dashed border-line"
          >
            <Clipboard aria-hidden="true" className="size-4" />
            Copiar link público
          </Button>

          {!shareSupported ? (
            <p className="flex items-start gap-2 rounded-2xl bg-surface px-3 py-2.5 text-meta leading-relaxed text-muted">
              <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Compartilhamento direto não está disponível neste navegador. Ao
              tocar em compartilhar, o PNG será baixado automaticamente.
            </p>
          ) : null}

          <div
            aria-live="polite"
            aria-atomic="true"
            className={`flex min-h-6 items-center gap-2 text-meta font-semibold ${
              action.state === "error"
                ? "text-danger-ink"
                : action.state === "unavailable"
                  ? "text-warning-ink"
                  : action.state === "success"
                    ? "text-teal-ink"
                    : "text-muted"
            }`}
          >
            {action.state === "generating" ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : action.state === "success" ? (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            ) : action.state === "error" ? (
              <TriangleAlert aria-hidden="true" className="size-4" />
            ) : action.state === "unavailable" ? (
              <WifiOff aria-hidden="true" className="size-4" />
            ) : null}
            {action.message}
          </div>
        </div>
      </Card>

      <Card className="flex items-center gap-3 bg-mint/60">
        <div className="shrink-0 rounded-2xl border border-teal/15 bg-white p-2 shadow-sm">
          {publicUrl ? (
            <QrCode value={publicUrl} className="size-14" />
          ) : (
            <div className="size-14 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
          )}
        </div>
        <div className="min-w-0">
          <CardTitle>QR Code sempre incluído</CardTitle>
          <p className="mt-1 text-meta leading-relaxed text-muted">
            Ele abre a página pública de {card.name} com os mesmos controles de
            privacidade da arte.
          </p>
        </div>
      </Card>
    </>
  );
}
