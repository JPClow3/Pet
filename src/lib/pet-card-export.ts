import { encode } from "uqr";

import { formatShortDate } from "@/lib/domain/dates";
import { speciesLabels } from "@/lib/domain/labels";
import type { PublicPetCard } from "@/lib/domain/schema";

export type PetCardFormat = "wallet" | "square" | "story";
export type PetCardTheme = "coral" | "ocean" | "berry";

export type PetCardArtworkInput = {
  card: PublicPetCard;
  photo: string | null;
  publicUrl: string;
  format: PetCardFormat;
  theme: PetCardTheme;
};

export const PET_CARD_FORMATS: Record<
  PetCardFormat,
  { label: string; hint: string; width: number; height: number }
> = {
  wallet: {
    label: "Carteira",
    hint: "horizontal · 1200 × 760",
    width: 1200,
    height: 760,
  },
  square: {
    label: "Quadrado",
    hint: "feed · 1080 × 1080",
    width: 1080,
    height: 1080,
  },
  story: {
    label: "Story",
    hint: "vertical · 1080 × 1920",
    width: 1080,
    height: 1920,
  },
};

export const PET_CARD_THEMES: Record<
  PetCardTheme,
  { label: string; accent: string; soft: string; mist: string; paper: string }
> = {
  coral: {
    label: "Pôr do sol",
    accent: "#f2553f",
    soft: "#ffe1d9",
    mist: "#dfe6ff",
    paper: "#fff9ef",
  },
  ocean: {
    label: "Maré mansa",
    accent: "#006b5b",
    soft: "#d7f7eb",
    mist: "#dcefff",
    paper: "#f7fcfa",
  },
  berry: {
    label: "Amora",
    accent: "#7556c8",
    soft: "#ebe3ff",
    mist: "#ffe1e7",
    paper: "#fff8fb",
  },
};

const COLORS = {
  ink: "#17213a",
  inkSoft: "#34405f",
  muted: "#65708a",
  cream: "#fff9ef",
  white: "#ffffff",
  coral: "#f2553f",
  coralSoft: "#ffe1d9",
  blue: "#3457d5",
  blueSoft: "#dfe6ff",
  teal: "#006b5b",
  mint: "#d7f7eb",
  sun: "#ffd45c",
  danger: "#b42318",
  dangerSoft: "#fce8e6",
} as const;

type CardCopy = {
  identity: string;
  location: string | null;
  health: string | null;
  contact: string | null;
  lost: string | null;
};

export function getPetCardCopy(card: PublicPetCard): CardCopy {
  const health =
    card.health?.status === "vencido"
      ? "Cuidados precisam de atenção"
      : card.health?.status === "atencao"
        ? "Próximo cuidado chegando"
        : card.health?.status === "em_dia"
          ? "Cuidados em dia"
          : null;

  const healthWithDate =
    health && card.health?.nextDueDate
      ? `${health} · ${formatShortDate(card.health.nextDueDate)}`
      : health;

  return {
    identity: [speciesLabels[card.species], card.breed]
      .filter(Boolean)
      .join(" · "),
    location: card.city,
    health: healthWithDate,
    contact: card.contact,
    lost: card.lost
      ? card.lost.since
        ? `Estou perdido desde ${formatShortDate(card.lost.since)}`
        : "Estou perdido"
      : null,
  };
}

export function petCardFileName(
  petName: string,
  format: PetCardFormat,
): string {
  const safeName = petName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  return `carteirinha-${safeName || "pet"}-${format}.png`;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const corner = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + corner, y);
  context.arcTo(x + width, y, x + width, y + height, corner);
  context.arcTo(x + width, y + height, x, y + height, corner);
  context.arcTo(x, y + height, x, y, corner);
  context.arcTo(x, y, x + width, y, corner);
  context.closePath();
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string | CanvasGradient,
) {
  roundedRect(context, x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
}

function drawPaw(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  color: string,
) {
  context.save();
  context.fillStyle = color;
  const pads = [
    [-0.3, -0.3, 0.15],
    [-0.1, -0.48, 0.14],
    [0.14, -0.46, 0.14],
    [0.34, -0.24, 0.14],
  ] as const;
  for (const [x, y, radius] of pads) {
    context.beginPath();
    context.arc(
      centerX + x * size,
      centerY + y * size,
      radius * size,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.beginPath();
  context.ellipse(
    centerX,
    centerY + size * 0.12,
    size * 0.36,
    size * 0.3,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

function drawQrCode(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
) {
  // Four modules are the QR standard quiet zone and survive print/social
  // recompression more reliably than a decorative two-module margin.
  const qr = encode(value, { ecc: "M", border: 4 });
  const cell = size / qr.size;
  context.fillStyle = COLORS.white;
  context.fillRect(x, y, size, size);
  context.fillStyle = COLORS.ink;
  qr.data.forEach((row, rowIndex) => {
    row.forEach((active, columnIndex) => {
      if (!active) return;
      const left = x + columnIndex * cell;
      const top = y + rowIndex * cell;
      context.fillRect(
        Math.floor(left),
        Math.floor(top),
        Math.ceil(cell),
        Math.ceil(cell),
      );
    });
  });
}

function fitText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  weight = 800,
) {
  let size = startSize;
  do {
    context.font = `${weight} ${size}px Manrope, Arial, sans-serif`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  } while (size > minSize);
  return size;
}

function ellipsize(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  if (context.measureText(value).width <= maxWidth) return value;
  let output = value;
  while (
    output.length > 1 &&
    context.measureText(`${output}…`).width > maxWidth
  ) {
    output = output.slice(0, -1);
  }
  return `${output.trimEnd()}…`;
}

function wrapText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines = 2,
) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  const consumed = lines.join(" ").split(/\s+/).length;
  if (consumed < words.length) {
    lines[lines.length - 1] = ellipsize(
      context,
      `${lines[lines.length - 1]} ${words.slice(consumed).join(" ")}`,
      maxWidth,
    );
  }
  return lines;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!source.startsWith("data:") && !source.startsWith("blob:")) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Não foi possível carregar a foto."));
    image.src = source;
  });
}

function drawPhoto(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  species: PublicPetCard["species"],
) {
  context.save();
  roundedRect(context, x, y, size, size, size * 0.24);
  context.clip();
  if (image) {
    const scale = Math.max(
      size / image.naturalWidth,
      size / image.naturalHeight,
    );
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(
      image,
      x + (size - width) / 2,
      y + (size - height) / 2,
      width,
      height,
    );
  } else {
    const gradient = context.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, COLORS.mint);
    gradient.addColorStop(1, COLORS.blueSoft);
    context.fillStyle = gradient;
    context.fillRect(x, y, size, size);
    drawPaw(context, x + size / 2, y + size / 2, size * 0.45, COLORS.teal);
    context.fillStyle = COLORS.inkSoft;
    context.textAlign = "center";
    context.font = `700 ${Math.round(size * 0.085)}px Manrope, Arial, sans-serif`;
    context.fillText(speciesLabels[species], x + size / 2, y + size * 0.84);
  }
  context.restore();
}

function drawBrand(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
) {
  fillRoundedRect(
    context,
    x,
    y,
    52 * scale,
    52 * scale,
    16 * scale,
    COLORS.sun,
  );
  drawPaw(context, x + 26 * scale, y + 28 * scale, 28 * scale, COLORS.ink);
  context.fillStyle = COLORS.ink;
  context.textAlign = "left";
  context.font = `800 ${28 * scale}px Manrope, Arial, sans-serif`;
  context.fillText("PetHub", x + 66 * scale, y + 37 * scale);
}

function drawPill(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: { fill?: string; color?: string; fontSize?: number } = {},
) {
  const fontSize = options.fontSize ?? 28;
  context.font = `700 ${fontSize}px Manrope, Arial, sans-serif`;
  const label = ellipsize(context, text, maxWidth - 44);
  const width = Math.min(maxWidth, context.measureText(label).width + 44);
  fillRoundedRect(
    context,
    x,
    y,
    width,
    fontSize + 28,
    (fontSize + 28) / 2,
    options.fill ?? COLORS.mint,
  );
  context.fillStyle = options.color ?? COLORS.teal;
  context.textAlign = "left";
  context.fillText(label, x + 22, y + fontSize + 4);
  return width;
}

function drawWallet(
  context: CanvasRenderingContext2D,
  input: PetCardArtworkInput,
  image: HTMLImageElement | null,
) {
  const { card, publicUrl } = input;
  const copy = getPetCardCopy(card);
  const theme = PET_CARD_THEMES[input.theme];
  const gradient = context.createLinearGradient(0, 0, 1200, 760);
  gradient.addColorStop(0, theme.paper);
  gradient.addColorStop(0.62, "#f8fbff");
  gradient.addColorStop(1, theme.mist);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1200, 760);

  context.fillStyle = theme.soft;
  context.beginPath();
  context.arc(1150, 70, 260, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = COLORS.mint;
  context.beginPath();
  context.arc(70, 740, 220, 0, Math.PI * 2);
  context.fill();

  fillRoundedRect(context, 48, 48, 1104, 664, 54, "rgba(255,255,255,0.84)");
  drawBrand(context, 88, 82, 1);
  context.fillStyle = COLORS.muted;
  context.textAlign = "right";
  context.font = "700 20px Manrope, Arial, sans-serif";
  context.fillText("IDENTIDADE DIGITAL", 1110, 112);

  drawPhoto(context, image, 88, 176, 330, card.species);
  context.strokeStyle = theme.accent;
  context.lineWidth = 8;
  roundedRect(context, 78, 166, 350, 350, 86);
  context.stroke();

  const nameSize = fitText(context, card.name, 430, 76, 48);
  context.fillStyle = COLORS.ink;
  context.textAlign = "left";
  context.font = `800 ${nameSize}px Manrope, Arial, sans-serif`;
  context.fillText(card.name, 474, 244);
  context.fillStyle = COLORS.inkSoft;
  context.font = "600 28px Manrope, Arial, sans-serif";
  context.fillText(ellipsize(context, copy.identity, 430), 474, 292);

  let pillY = 330;
  if (copy.location) {
    drawPill(context, copy.location, 474, pillY, 430, {
      fill: COLORS.blueSoft,
      color: COLORS.blue,
      fontSize: 24,
    });
    pillY += 65;
  }
  if (copy.health) {
    drawPill(context, copy.health, 474, pillY, 430, { fontSize: 23 });
  }
  if (copy.lost) {
    drawPill(context, copy.lost, 474, pillY + 65, 430, {
      fill: COLORS.dangerSoft,
      color: COLORS.danger,
      fontSize: 23,
    });
  }

  fillRoundedRect(context, 88, 554, 816, 112, 32, COLORS.ink);
  context.fillStyle = COLORS.white;
  context.font = "700 20px Manrope, Arial, sans-serif";
  context.fillText(
    copy.contact ? "CONTATO DO TUTOR" : "SE ENCONTRAR ESTE PET",
    120,
    590,
  );
  context.font = "800 31px Manrope, Arial, sans-serif";
  context.fillText(
    ellipsize(context, copy.contact ?? "Escaneie o QR Code", 750),
    120,
    635,
  );

  fillRoundedRect(context, 926, 180, 184, 184, 30, COLORS.white);
  drawQrCode(context, publicUrl, 944, 198, 148);
  context.fillStyle = COLORS.inkSoft;
  context.textAlign = "center";
  context.font = "700 19px Manrope, Arial, sans-serif";
  context.fillText("Escaneie para ver", 1018, 400);
  context.font = "500 17px Manrope, Arial, sans-serif";
  context.fillText("os dados públicos", 1018, 428);
  context.fillStyle = theme.accent;
  context.fillRect(926, 464, 184, 8);
  context.fillStyle = COLORS.muted;
  context.font = "600 16px Manrope, Arial, sans-serif";
  context.fillText("Feito com carinho", 1018, 515);
  context.fillText("no PetHub", 1018, 541);
  context.font = "600 14px Manrope, Arial, sans-serif";
  context.fillText(`Gerado em ${generatedOn()}`, 1018, 578);
}

function drawSocial(
  context: CanvasRenderingContext2D,
  input: PetCardArtworkInput,
  image: HTMLImageElement | null,
) {
  const { card, publicUrl, format } = input;
  const copy = getPetCardCopy(card);
  const theme = PET_CARD_THEMES[input.theme];
  const story = format === "story";
  const width = 1080;
  const height = story ? 1920 : 1080;
  const margin = story ? 82 : 64;
  const cardTop = story ? 214 : 96;
  const cardHeight = story ? 1492 : 888;
  const photoSize = story ? 590 : 340;
  const photoX = (width - photoSize) / 2;
  const photoY = cardTop + (story ? 146 : 84);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, theme.paper);
  gradient.addColorStop(0.55, "#f9f8ff");
  gradient.addColorStop(1, theme.mist);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = COLORS.sun;
  context.beginPath();
  context.arc(1030, story ? 180 : 80, story ? 270 : 210, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = theme.soft;
  context.beginPath();
  context.arc(36, height - 80, story ? 320 : 230, 0, Math.PI * 2);
  context.fill();

  if (story) drawBrand(context, margin, 90, 1.2);
  fillRoundedRect(
    context,
    margin,
    cardTop,
    width - margin * 2,
    cardHeight,
    story ? 72 : 60,
    "rgba(255,255,255,0.9)",
  );

  drawPhoto(context, image, photoX, photoY, photoSize, card.species);
  context.strokeStyle = theme.accent;
  context.lineWidth = story ? 12 : 9;
  roundedRect(
    context,
    photoX - 12,
    photoY - 12,
    photoSize + 24,
    photoSize + 24,
    photoSize * 0.25,
  );
  context.stroke();

  const nameY = photoY + photoSize + (story ? 112 : 72);
  const nameSize = fitText(
    context,
    card.name,
    width - margin * 2 - 96,
    story ? 106 : 72,
    story ? 64 : 46,
  );
  context.fillStyle = COLORS.ink;
  context.textAlign = "center";
  context.font = `800 ${nameSize}px Manrope, Arial, sans-serif`;
  context.fillText(card.name, width / 2, nameY);
  context.fillStyle = COLORS.inkSoft;
  context.font = `600 ${story ? 36 : 27}px Manrope, Arial, sans-serif`;
  context.fillText(
    ellipsize(context, copy.identity, width - margin * 2 - 110),
    width / 2,
    nameY + (story ? 62 : 45),
  );

  let currentY = nameY + (story ? 108 : 80);
  context.textAlign = "left";
  if (copy.location) {
    const fontSize = story ? 31 : 22;
    context.font = `700 ${fontSize}px Manrope, Arial, sans-serif`;
    const textWidth = Math.min(
      width - margin * 2 - 110,
      context.measureText(copy.location).width + 50,
    );
    drawPill(
      context,
      copy.location,
      (width - textWidth) / 2,
      currentY,
      textWidth,
      {
        fill: COLORS.blueSoft,
        color: COLORS.blue,
        fontSize,
      },
    );
    currentY += story ? 86 : 65;
  }
  if (copy.health) {
    const fontSize = story ? 30 : 21;
    context.font = `700 ${fontSize}px Manrope, Arial, sans-serif`;
    const textWidth = Math.min(
      width - margin * 2 - 110,
      context.measureText(copy.health).width + 50,
    );
    drawPill(
      context,
      copy.health,
      (width - textWidth) / 2,
      currentY,
      textWidth,
      {
        fontSize,
      },
    );
    currentY += story ? 88 : 65;
  }

  if (copy.lost && story) {
    const alertY = currentY + (story ? 12 : 0);
    fillRoundedRect(
      context,
      margin + 48,
      alertY,
      width - margin * 2 - 96,
      story ? 118 : 82,
      30,
      COLORS.dangerSoft,
    );
    context.fillStyle = COLORS.danger;
    context.textAlign = "center";
    context.font = `800 ${story ? 35 : 25}px Manrope, Arial, sans-serif`;
    context.fillText(copy.lost, width / 2, alertY + (story ? 70 : 50));
    currentY = alertY + (story ? 150 : 104);
  }

  if (copy.lost && !story) {
    const alertWidth = width - margin * 2 - 190;
    fillRoundedRect(
      context,
      (width - alertWidth) / 2,
      photoY + photoSize - 34,
      alertWidth,
      68,
      28,
      COLORS.dangerSoft,
    );
    context.fillStyle = COLORS.danger;
    context.textAlign = "center";
    context.font = "800 24px Manrope, Arial, sans-serif";
    context.fillText(copy.lost, width / 2, photoY + photoSize + 9);
  }

  const qrSize = story ? 288 : 132;
  const footerY = story
    ? cardTop + cardHeight - 430
    : cardTop + cardHeight - 186;
  fillRoundedRect(
    context,
    margin + 48,
    footerY,
    width - margin * 2 - 96,
    story ? 350 : 152,
    story ? 48 : 34,
    COLORS.ink,
  );
  fillRoundedRect(
    context,
    margin + 78,
    footerY + (story ? 31 : 18),
    qrSize,
    qrSize,
    story ? 38 : 24,
    COLORS.white,
  );
  drawQrCode(
    context,
    publicUrl,
    margin + 98,
    footerY + (story ? 51 : 38),
    qrSize - 40,
  );

  const copyX = margin + 78 + qrSize + (story ? 46 : 30);
  const copyWidth = width - margin - 70 - copyX;
  context.fillStyle = COLORS.sun;
  context.textAlign = "left";
  context.font = `800 ${story ? 24 : 17}px Manrope, Arial, sans-serif`;
  context.fillText("CARTEIRINHA DIGITAL", copyX, footerY + (story ? 86 : 55));
  context.fillStyle = COLORS.white;
  context.font = `800 ${story ? 39 : 25}px Manrope, Arial, sans-serif`;
  const contactLines = wrapText(
    context,
    copy.contact ?? "Escaneie para ajudar este pet",
    copyWidth,
    story ? 3 : 2,
  );
  contactLines.forEach((line, index) => {
    context.fillText(
      line,
      copyX,
      footerY + (story ? 140 : 94) + index * (story ? 52 : 33),
    );
  });

  if (story) {
    context.fillStyle = "rgba(255,255,255,0.72)";
    context.font = "600 22px Manrope, Arial, sans-serif";
    context.fillText(
      "Mostra somente os dados autorizados",
      copyX,
      footerY + 302,
    );
    context.font = "600 19px Manrope, Arial, sans-serif";
    context.fillText(`Gerado em ${generatedOn()}`, copyX, footerY + 332);
  }

  if (!story) {
    drawBrand(context, margin + 36, cardTop + 34, 0.78);
    context.fillStyle = COLORS.inkSoft;
    context.textAlign = "center";
    context.font = "600 16px Manrope, Arial, sans-serif";
    context.fillText(
      `Gerado em ${generatedOn()} · atualize a arte após mudar os dados`,
      width / 2,
      1038,
    );
  } else {
    context.fillStyle = COLORS.inkSoft;
    context.textAlign = "center";
    context.font = "700 24px Manrope, Arial, sans-serif";
    context.fillText(
      "Compartilhe cuidado. Preserve histórias.",
      width / 2,
      1798,
    );
  }
}

function generatedOn() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

export async function createPetCardPng(
  input: PetCardArtworkInput,
): Promise<Blob> {
  const definition = PET_CARD_FORMATS[input.format];
  const canvas = document.createElement("canvas");
  canvas.width = definition.width;
  canvas.height = definition.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não permite gerar a imagem.");

  if ("fonts" in document) {
    await document.fonts.ready;
  }
  let image: HTMLImageElement | null = null;
  if (input.photo) {
    try {
      image = await loadImage(input.photo);
    } catch {
      image = null;
    }
  }

  if (input.format === "wallet") drawWallet(context, input, image);
  else drawSocial(context, input, image);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível finalizar a imagem."));
      },
      "image/png",
      1,
    );
  });
}

export function downloadPetCard(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.rel = "noopener";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
}
