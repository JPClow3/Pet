import { encode } from "uqr";
import { formatShortDate } from "./dates";
import { speciesLabels } from "./labels";
import type { Pet } from "./schema";

export type LostPosterInput = {
  pet: Pet;
  photo: string | null;
  publicUrl: string | null;
  neighborhood?: string | null;
  city?: string | null;
  contactPhone?: string | null;
  reward?: string | null;
  since?: string | null;
  note?: string | null;
};

export function qrCodeSvg(value: string, size = 160): string {
  const qr = encode(value, { ecc: "M", border: 2 });
  const cell = size / qr.size;
  let paths = "";
  qr.data.forEach((row, r) => {
    row.forEach((active, c) => {
      if (active) {
        const x = Math.floor(c * cell);
        const y = Math.floor(r * cell);
        const w = Math.ceil(cell);
        const h = Math.ceil(cell);
        paths += `M${x},${y}h${w}v${h}h-${w}z `;
      }
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#ffffff"/><path d="${paths}" fill="#111827"/></svg>`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

export function generateLostPosterHtml(input: LostPosterInput): string {
  const { pet, photo, publicUrl } = input;
  const neighborhood =
    input.neighborhood ?? pet.lostMode.neighborhood ?? "";
  const city = input.city ?? pet.card.shareCity ? "" : "";
  const phone =
    input.contactPhone ??
    pet.lostMode.contactPhone ??
    pet.card.contact ??
    "";
  const reward = input.reward ?? pet.lostMode.reward ?? "";
  const since = input.since ?? pet.lostMode.since;
  const note = input.note ?? pet.lostMode.note ?? "";

  const species = speciesLabels[pet.species];
  const breed = pet.breed ?? "Sem raça definida";
  const color = pet.color ? `Cor: ${pet.color}` : null;
  const chip = pet.microchip ? `Microchip: ${pet.microchip}` : null;

  const characteristics = [species, breed, color, chip]
    .filter(Boolean)
    .join(" · ");

  const locationText = [
    neighborhood ? `Bairro: ${neighborhood}` : null,
    input.city ? `Cidade: ${input.city}` : null,
    since ? `Desaparecido desde: ${formatShortDate(since)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const qrSvg = publicUrl ? qrCodeSvg(publicUrl, 160) : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Cartaz de Procura-se: ${escapeHtml(pet.name)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .page {
      width: 210mm;
      height: 297mm;
      background: #ffffff;
      padding: 12mm 15mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      border: 8px solid #dc2626;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header-banner {
      background: #dc2626;
      color: #ffffff;
      text-align: center;
      padding: 10px 0;
      margin: -12mm -15mm 10px -15mm;
    }
    .header-banner h1 {
      margin: 0;
      font-size: 46px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      line-height: 1;
    }
    .header-banner p {
      margin: 4px 0 0;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      opacity: 0.95;
    }
    .photo-container {
      width: 100%;
      height: 98mm;
      background: #f1f5f9;
      border: 4px solid #dc2626;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }
    .photo-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
    .photo-placeholder {
      font-size: 72px;
      color: #94a3b8;
    }
    .pet-name-box {
      text-align: center;
      margin-bottom: 6px;
    }
    .pet-name {
      font-size: 44px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.1;
      margin: 0;
      text-transform: uppercase;
    }
    .pet-traits {
      font-size: 17px;
      font-weight: 600;
      color: #475569;
      margin-top: 4px;
    }
    .location-box {
      background: #fef2f2;
      border-left: 6px solid #dc2626;
      padding: 8px 14px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .location-title {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      color: #b91c1c;
      letter-spacing: 0.05em;
    }
    .location-text {
      font-size: 17px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 2px;
    }
    ${
      reward
        ? `
    .reward-banner {
      background: #fef08a;
      border: 3px dashed #ca8a04;
      border-radius: 6px;
      text-align: center;
      padding: 8px;
      margin-bottom: 8px;
    }
    .reward-banner h2 {
      margin: 0;
      font-size: 26px;
      font-weight: 900;
      color: #854d0e;
      letter-spacing: 0.04em;
    }`
        : ""
    }
    .notes-box {
      font-size: 15px;
      color: #334155;
      line-height: 1.35;
      margin-bottom: 8px;
      padding: 6px 10px;
      background: #f8fafc;
      border-radius: 4px;
      font-style: italic;
    }
    .contact-qr-grid {
      display: grid;
      grid-template-columns: ${publicUrl ? "1fr 140px" : "1fr"};
      gap: 14px;
      align-items: center;
      background: #f1f5f9;
      border: 3px solid #0f172a;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 6px;
    }
    .contact-box {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .contact-label {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.06em;
    }
    .contact-phone {
      font-size: 34px;
      font-weight: 900;
      color: #dc2626;
      letter-spacing: 0.02em;
      line-height: 1.1;
      margin: 4px 0;
    }
    .contact-sub {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }
    .qr-side {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .qr-caption {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 4px;
      color: #0f172a;
      line-height: 1.2;
    }
    .footer-instructions {
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #e2e8f0;
    }
    .no-print-bar {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 999;
      background: #0f172a;
      padding: 10px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .btn-action {
      background: #dc2626;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      body { background: transparent; }
      .page {
        width: 100vw;
        height: 100vh;
        border: 8px solid #dc2626;
        box-shadow: none;
        margin: 0;
      }
      .no-print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <button class="btn-action" onclick="window.print()">Imprimir / Salvar como PDF</button>
  </div>

  <div class="page">
    <div class="header-banner">
      <h1>PROCURA-SE</h1>
      <p>AJUDE A ENCONTRAR ESTE PET</p>
    </div>

    <div class="photo-container">
      ${
        photo
          ? `<img src="${escapeHtml(photo)}" alt="Foto de ${escapeHtml(pet.name)}">`
          : `<div class="photo-placeholder">🐾</div>`
      }
    </div>

    <div class="pet-name-box">
      <h2 class="pet-name">${escapeHtml(pet.name.toUpperCase())}</h2>
      <div class="pet-traits">${escapeHtml(characteristics)}</div>
    </div>

    ${
      locationText
        ? `
    <div class="location-box">
      <div class="location-title">Última localização vista</div>
      <div class="location-text">${escapeHtml(locationText)}</div>
    </div>`
        : ""
    }

    ${
      reward
        ? `
    <div class="reward-banner">
      <h2>RECOMPENSA: ${escapeHtml(reward)}</h2>
    </div>`
        : ""
    }

    ${
      note
        ? `
    <div class="notes-box">
      "${escapeHtml(note)}"
    </div>`
        : ""
    }

    <div class="contact-qr-grid">
      <div class="contact-box">
        <div class="contact-label">Se você viu ou encontrou, entre em contato:</div>
        <div class="contact-phone">${escapeHtml(phone || "Verifique pelo QR Code")}</div>
        <div class="contact-sub">Ligação ou WhatsApp a qualquer hora · Por favor tire uma foto</div>
      </div>
      ${
        publicUrl
          ? `
      <div class="qr-side">
        ${qrSvg}
        <div class="qr-caption">Aponte a câmera ou acesse:</div>
        <div style="font-size: 8px; color: #475569; word-break: break-all; margin-top: 2px;">${escapeHtml(publicUrl)}</div>
      </div>`
          : ""
      }
    </div>

    <div class="footer-instructions">
      ${pet.microchip ? `Animal com Microchip ISO: <strong>${escapeHtml(pet.microchip)}</strong> (qualquer clínica veterinária pode ler gratuitamente). ` : ""}
      Cartaz gerado pelo aplicativo Zelupi · Compartilhe no WhatsApp ou imprima para fixar no bairro.
    </div>
  </div>
</body>
</html>`;
}
