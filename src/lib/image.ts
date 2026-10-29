"use client";

export function calculateResizeDimensions(
  width: number,
  height: number,
  maxSize = 1600,
): { width: number; height: number; scale: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0, scale: 1 };
  const scale = Math.min(1, maxSize / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    scale,
  };
}

export async function fileToCompressedDataUrl(
  file: File | Blob,
  maxSize = 1600,
  quality = 0.8,
  preferredMimeType = "image/webp",
): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const { width, height } = calculateResizeDimensions(
    image.width,
    image.height,
    maxSize,
  );

  if (width <= 0 || height <= 0) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  // Try preferred format (WebP by default), fallback to JPEG if unsupported
  let result = canvas.toDataURL(preferredMimeType, quality);
  if (
    preferredMimeType === "image/webp" &&
    !result.startsWith("data:image/webp")
  ) {
    result = canvas.toDataURL("image/jpeg", quality);
  }
  return result;
}

function readAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
    image.src = source;
  });
}

