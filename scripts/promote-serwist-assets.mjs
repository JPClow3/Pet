import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const artifacts = [
  [".next/server/app/serwist/sw.js.body", ".open-next/assets/serwist/sw.js"],
  [
    ".next/server/app/serwist/sw.js.map.body",
    ".open-next/assets/serwist/sw.js.map",
  ],
];

for (const [source, destination] of artifacts) {
  const sourceStats = await stat(source);

  if (!sourceStats.isFile() || sourceStats.size === 0) {
    throw new Error(`Serwist build artifact is missing or empty: ${source}`);
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  console.log(`Promoted ${source} to ${destination}`);
}
