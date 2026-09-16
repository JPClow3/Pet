"use client";

import { Camera, ImagePlus, LoaderCircle, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Photo } from "@/components/ui/photo";
import { fileToCompressedDataUrl } from "@/lib/image";
import { cn } from "@/lib/utils";

export function PhotoPicker({
  photo,
  name,
  onChange,
  className,
}: {
  photo: string | null;
  name: string;
  onChange: (photo: string | null) => void;
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Essa imagem é grande demais. Escolha uma foto de até 15 MB.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onChange(await fileToCompressedDataUrl(file));
    } catch {
      setError("Não foi possível usar essa imagem. Tente outra foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-describedby={`${inputId}-hint`}
        aria-label={
          photo ? `Trocar foto de ${name}` : `Adicionar foto de ${name}`
        }
        className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-dashed border-line bg-surface text-muted transition-[border-color,background-color] hover:border-teal-ink hover:bg-mint disabled:pointer-events-none disabled:opacity-60"
      >
        {photo ? (
          <Photo src={photo} alt={`Foto de ${name}`} className="size-full" />
        ) : (
          <ImagePlus aria-hidden="true" className="size-7" />
        )}
        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/45 text-white">
            <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
          </span>
        ) : null}
      </button>

      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[0.9rem] font-semibold text-ink">Foto do perfil</p>
        <p id={`${inputId}-hint`} className="max-w-[26ch] text-meta text-muted">
          {busy
            ? "Processando foto…"
            : "Opcional. Fica salva só neste aparelho."}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[14px] border border-line bg-white px-3 text-[0.85rem] font-semibold text-ink transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-50"
          >
            <ImagePlus aria-hidden="true" className="size-4" />
            {photo ? "Trocar" : "Escolher"}
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[14px] border border-line bg-white px-3 text-[0.85rem] font-semibold text-ink transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-50"
          >
            <Camera aria-hidden="true" className="size-4" />
            Câmera
          </button>
        </div>
        {photo ? (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setError(null);
            }}
            disabled={busy}
            className="inline-flex min-h-9 items-center gap-1 self-start rounded-full px-2 text-meta font-medium text-muted transition-colors hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-50"
          >
            <X aria-hidden="true" className="size-3.5" />
            Remover foto
          </button>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="max-w-[32ch] text-meta font-medium text-danger-ink"
          >
            {error}
          </p>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          await readFile(file);
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          await readFile(file);
        }}
      />
    </div>
  );
}
