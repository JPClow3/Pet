import { encode } from "uqr";
import { formatShortDate } from "./domain/dates";
import { speciesLabels } from "./domain/labels";
import type { Pet } from "./domain/schema";

export type LostPosterArtworkFormat = "a4" | "square" | "story";

export type LostPosterArtworkInput = {
  pet: Pet;
  photo: string | null;
  publicUrl: string | null;
  neighborhood?: string | null;
  city?: string | null;
  contactPhone?: string | null;
  reward?: string | null;
  since?: string | null;
  note?: string | null;
  format?: LostPosterArtworkFormat;
};

const POSTER_FORMATS: Record<
  LostPosterArtworkFormat,
  { width: number; height: number; label: string }
> = {
  a4: { width: 1240, height: 1754, label: "A4 para Impressão" },
  square: { width: 1080, height: 1080, label: "Quadrado / WhatsApp" },
  story: { width: 1080, height: 1920, label: "Story / Status" },
};

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const corner = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.arcTo(x + w, y, x + w, y + h, corner);
  ctx.arcTo(x + w, y + h, x, y + h, corner);
  ctx.arcTo(x, y + h, x, y, corner);
  ctx.arcTo(x, y, x + w, y, corner);
  ctx.closePath();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
) {
  roundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawQrCode(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
) {
  const qr = encode(value, { ecc: "M", border: 2 });
  const cell = size / qr.size;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#0f172a";
  qr.data.forEach((row, r) => {
    row.forEach((active, c) => {
      if (active) {
        ctx.fillRect(
          Math.floor(x + c * cell),
          Math.floor(y + r * cell),
          Math.ceil(cell),
          Math.ceil(cell),
        );
      }
    });
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao carregar imagem"));
    image.src = src;
  });
}

export function lostPosterFileName(
  petName: string,
  format: LostPosterArtworkFormat = "a4",
): string {
  const safeName = petName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  return `cartaz-perdido-${safeName || "pet"}-${format}.png`;
}

export async function createLostPosterPng(
  input: LostPosterArtworkInput,
): Promise<Blob> {
  const format = input.format ?? "a4";
  const def = POSTER_FORMATS[format];
  const canvas = document.createElement("canvas");
  canvas.width = def.width;
  canvas.height = def.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado.");

  if ("fonts" in document) {
    await document.fonts.ready;
  }

  let photoImg: HTMLImageElement | null = null;
  if (input.photo) {
    try {
      photoImg = await loadImage(input.photo);
    } catch {
      photoImg = null;
    }
  }

  const { width, height } = def;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Red Outer Border
  const borderWidth = format === "a4" ? 24 : 18;
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = "#dc2626";
  ctx.strokeRect(
    borderWidth / 2,
    borderWidth / 2,
    width - borderWidth,
    height - borderWidth,
  );

  const innerMargin = borderWidth + (format === "a4" ? 24 : 20);

  // Top Alert Header
  const headerHeight = format === "a4" ? 140 : 110;
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(innerMargin, innerMargin, width - innerMargin * 2, headerHeight);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = `900 ${format === "a4" ? 72 : 56}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(
    "PROCURA-SE",
    width / 2,
    innerMargin + (format === "a4" ? 74 : 58),
  );

  ctx.font = `700 ${format === "a4" ? 24 : 20}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(
    "AJUDE A ENCONTRAR ESTE PET",
    width / 2,
    innerMargin + (format === "a4" ? 116 : 94),
  );

  let currentY = innerMargin + headerHeight + (format === "a4" ? 24 : 16);

  // Photo
  const photoHeight = format === "a4" ? 560 : format === "story" ? 680 : 380;
  const photoWidth = width - innerMargin * 2;
  const photoX = innerMargin;
  const photoY = currentY;

  fillRoundedRect(ctx, photoX, photoY, photoWidth, photoHeight, 16, "#f1f5f9");

  if (photoImg) {
    ctx.save();
    roundedRect(ctx, photoX, photoY, photoWidth, photoHeight, 16);
    ctx.clip();

    // Center crop
    const imgRatio = photoImg.width / photoImg.height;
    const boxRatio = photoWidth / photoHeight;
    let renderW = photoWidth;
    let renderH = photoHeight;
    let renderX = photoX;
    let renderY = photoY;

    if (imgRatio > boxRatio) {
      renderW = photoHeight * imgRatio;
      renderX = photoX - (renderW - photoWidth) / 2;
    } else {
      renderH = photoWidth / imgRatio;
      renderY = photoY - (renderH - photoHeight) / 2;
    }
    ctx.drawImage(photoImg, renderX, renderY, renderW, renderH);
    ctx.restore();

    // Inner photo border
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#dc2626";
    roundedRect(ctx, photoX, photoY, photoWidth, photoHeight, 16);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "80px system-ui";
    ctx.fillText("🐾", photoX + photoWidth / 2, photoY + photoHeight / 2 + 28);
  }

  currentY += photoHeight + (format === "a4" ? 30 : 20);

  // Pet Name
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.font = `900 ${format === "a4" ? 64 : 48}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(input.pet.name.toUpperCase(), width / 2, currentY + 40);
  currentY += 56;

  // Species, Breed, Color
  const traits = [
    speciesLabels[input.pet.species],
    input.pet.breed ?? "Sem raça definida",
    input.pet.color ? `Cor: ${input.pet.color}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  ctx.fillStyle = "#475569";
  ctx.font = `700 ${format === "a4" ? 26 : 20}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(traits, width / 2, currentY + 20);
  currentY += 40;

  // Location / Disappearance
  const neighborhood =
    input.neighborhood ?? input.pet.lostMode.neighborhood ?? "";
  const city = input.city ?? "";
  const since = input.since ?? input.pet.lostMode.since;
  const locationLines = [
    neighborhood ? `Bairro: ${neighborhood}` : null,
    city ? `Cidade: ${city}` : null,
    since ? `Desaparecido desde: ${formatShortDate(since)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (locationLines) {
    fillRoundedRect(
      ctx,
      innerMargin,
      currentY,
      width - innerMargin * 2,
      format === "a4" ? 64 : 52,
      12,
      "#fef2f2",
    );
    ctx.fillStyle = "#b91c1c";
    ctx.textAlign = "center";
    ctx.font = `800 ${format === "a4" ? 22 : 18}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(locationLines, width / 2, currentY + (format === "a4" ? 40 : 34));
    currentY += (format === "a4" ? 64 : 52) + 16;
  }

  // Reward Banner if present
  const reward = input.reward ?? input.pet.lostMode.reward;
  if (reward) {
    fillRoundedRect(
      ctx,
      innerMargin,
      currentY,
      width - innerMargin * 2,
      format === "a4" ? 72 : 56,
      12,
      "#fef08a",
    );
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ca8a04";
    roundedRect(
      ctx,
      innerMargin,
      currentY,
      width - innerMargin * 2,
      format === "a4" ? 72 : 56,
      12,
    );
    ctx.stroke();

    ctx.fillStyle = "#854d0e";
    ctx.textAlign = "center";
    ctx.font = `900 ${format === "a4" ? 34 : 26}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(
      `RECOMPENSA: ${reward}`,
      width / 2,
      currentY + (format === "a4" ? 48 : 38),
    );
    currentY += (format === "a4" ? 72 : 56) + 16;
  }

  // Notes if space permits
  const note = input.note ?? input.pet.lostMode.note;
  if (note && format !== "square") {
    ctx.fillStyle = "#334155";
    ctx.font = `italic 600 ${format === "a4" ? 20 : 16}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`"${note}"`, width / 2, currentY + 20);
    currentY += 40;
  }

  // Contact & QR Box
  const contactPhone =
    input.contactPhone ??
    input.pet.lostMode.contactPhone ??
    input.pet.card.contact ??
    "";
  const boxHeight = format === "a4" ? 200 : 160;
  const boxY = height - innerMargin - boxHeight - (format === "a4" ? 50 : 36);

  fillRoundedRect(
    ctx,
    innerMargin,
    boxY,
    width - innerMargin * 2,
    boxHeight,
    16,
    "#0f172a",
  );

  const qrSize = boxHeight - 32;
  const qrX = width - innerMargin - qrSize - 16;
  const qrY = boxY + 16;

  if (input.publicUrl) {
    fillRoundedRect(ctx, qrX, qrY, qrSize, qrSize, 8, "#ffffff");
    drawQrCode(ctx, input.publicUrl, qrX + 8, qrY + 8, qrSize - 16);
  }

  const textLeft = innerMargin + 24;
  ctx.textAlign = "left";
  ctx.fillStyle = "#f87171";
  ctx.font = `800 ${format === "a4" ? 20 : 16}px system-ui, -apple-system, sans-serif`;
  ctx.fillText("SE VOCÊ VIU OU ENCONTROU, CONTATE:", textLeft, boxY + 44);

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${format === "a4" ? 46 : 32}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(
    contactPhone || "Consulte pelo QR Code ao lado",
    textLeft,
    boxY + 106,
  );

  ctx.fillStyle = "#94a3b8";
  ctx.font = `600 ${format === "a4" ? 18 : 14}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(
    "Ligação ou WhatsApp a qualquer hora · Por favor tire uma foto",
    textLeft,
    boxY + 148,
  );

  // Footer line
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.font = `600 ${format === "a4" ? 14 : 12}px system-ui, -apple-system, sans-serif`;
  const chipNote = input.pet.microchip
    ? `Animal com Microchip ISO: ${input.pet.microchip} · Leitura gratuita em qualquer clínica veterinária · `
    : "";
  ctx.fillText(
    `${chipNote}Cartaz gerado pelo aplicativo Zelupi`,
    width / 2,
    height - innerMargin - 12,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao gerar o arquivo de imagem do cartaz."));
      },
      "image/png",
      1,
    );
  });
}

export function downloadLostPoster(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.rel = "noopener";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
}

export function openPrintableLostPoster(html: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error(
      "O navegador bloqueou a abertura da janela. Permita pop-ups para imprimir.",
    );
  }
  printWindow.document.write(html);
  printWindow.document.close();
}
