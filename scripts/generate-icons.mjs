import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import "./sync-brand-tokens.mjs";

const tokens = JSON.parse(await readFile("assets/design-tokens.json", "utf8"));
const { light: colors, mark, brand } = tokens;
const symbol = `<path d="${mark.path}" fill="none" stroke="${colors.canvas}" stroke-width="${mark.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${mark.dot.cx}" cy="${mark.dot.cy}" r="${mark.dot.r}" fill="${colors.accent}"/>`;
function icon(rounded) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${rounded ? 20 : 0}" fill="${colors.brand}"/>${symbol}</svg>`;
}
const targets = [
  { file: "public/icons/zelupi-192.png", size: 192, rounded: true },
  { file: "public/icons/zelupi-512.png", size: 512, rounded: true },
  { file: "public/icons/zelupi-maskable-512.png", size: 512, rounded: false },
  { file: "src/app/apple-icon.png", size: 180, rounded: false },
];
for (const target of targets) {
  const destination = path.join(process.cwd(), target.file);
  await mkdir(path.dirname(destination), { recursive: true });
  await sharp(Buffer.from(icon(target.rounded)), { density: 384 })
    .resize(target.size, target.size)
    .png({ compressionLevel: 9 })
    .toFile(destination);
  console.log(`generated ${target.file} (${target.size}px)`);
}
for (const [current, legacy] of [
  ["zelupi-192.png", "icon-192.png"],
  ["zelupi-512.png", "icon-512.png"],
  ["zelupi-maskable-512.png", "maskable-512.png"],
]) {
  await writeFile(
    "public/icons/" + legacy,
    await readFile("public/icons/" + current),
  );
}
const badge =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="' +
  mark.path +
  '" fill="none" stroke="white" stroke-width="' +
  mark.strokeWidth +
  '" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' +
  mark.dot.cx +
  '" cy="' +
  mark.dot.cy +
  '" r="' +
  mark.dot.r +
  '" fill="white"/></svg>';
await sharp(Buffer.from(badge))
  .resize(96, 96)
  .png()
  .toFile("public/icons/zelupi-badge.png");

const favicon = await sharp(Buffer.from(icon(true)), { density: 384 })
  .resize(32, 32)
  .png()
  .toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 32;
header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(favicon.length, 14);
header.writeUInt32LE(22, 18);
await writeFile("src/app/favicon.ico", Buffer.concat([header, favicon]));
const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${colors.canvas}"/><circle cx="1170" cy="610" r="235" fill="${colors.lime}"/><svg x="88" y="66" width="78" height="78" viewBox="0 0 64 64"><rect width="64" height="64" rx="20" fill="${colors.brand}"/>${symbol}</svg><text x="184" y="125" font-family="Arial,sans-serif" font-weight="800" font-size="70" letter-spacing="-4" fill="${colors.ink}">${brand.wordmark}</text><text x="88" y="294" font-family="Georgia,serif" font-size="79" fill="${colors.ink}">O cuidado de hoje.</text><text x="88" y="389" font-family="Georgia,serif" font-size="69" fill="${colors.brand}">A história inteira do seu pet.</text><text x="88" y="516" font-family="Arial,sans-serif" font-size="27" fill="${colors["ink-soft"]}">Cuidados, documentos e momentos. No ritmo de vocês.</text></svg>`;
await writeFile("public/brand/zelupi-social.svg", social);
const socialPng = await sharp(Buffer.from(social))
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile("src/app/opengraph-image.png", socialPng);
await writeFile("src/app/twitter-image.png", socialPng);
await writeFile(
  "src/app/opengraph-image.alt.txt",
  `${brand.name} — ${brand.tagline}`,
);
await writeFile(
  "src/app/twitter-image.alt.txt",
  `${brand.name} — ${brand.tagline}`,
);
console.log("generated favicon and social images");
