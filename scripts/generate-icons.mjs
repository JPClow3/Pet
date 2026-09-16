import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const TEAL = "#2aa198";
const WHITE = "#ffffff";

const PAW = `
  <g>
    <ellipse cx="141" cy="203" rx="53" ry="65" transform="rotate(-18 141 203)" />
    <ellipse cx="229" cy="146" rx="55" ry="68" transform="rotate(-6 229 146)" />
    <ellipse cx="327" cy="152" rx="55" ry="68" transform="rotate(6 327 152)" />
    <ellipse cx="409" cy="213" rx="52" ry="63" transform="rotate(18 409 213)" />
    <ellipse cx="271" cy="349" rx="119" ry="97" />
  </g>
`;

function pawGroup(scale, fill) {
  return `<g fill="${fill}" transform="translate(256 256) scale(${scale}) translate(-256 -256)">${PAW}</g>`;
}

function roundedIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" rx="112" fill="${TEAL}" />
    ${pawGroup(0.86, WHITE)}
  </svg>`;
}

function fullBleedIcon(scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" fill="${TEAL}" />
    ${pawGroup(scale, WHITE)}
  </svg>`;
}

const targets = [
  { file: "public/icons/icon-192.png", size: 192, svg: roundedIcon() },
  { file: "public/icons/icon-512.png", size: 512, svg: roundedIcon() },
  { file: "public/icons/maskable-512.png", size: 512, svg: fullBleedIcon(0.62) },
  { file: "src/app/apple-icon.png", size: 180, svg: fullBleedIcon(0.72) },
];

for (const target of targets) {
  const destination = path.join(process.cwd(), target.file);
  await mkdir(path.dirname(destination), { recursive: true });
  await sharp(Buffer.from(target.svg), { density: 384 })
    .resize(target.size, target.size)
    .png({ compressionLevel: 9 })
    .toFile(destination);
  console.log(`generated ${target.file} (${target.size}px)`);
}
