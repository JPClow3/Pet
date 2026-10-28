import {
  openDeviceDatabase,
  requestResult,
  type StoredMedia,
} from "./device-db";

export const MEDIA_PREFIX = "pethub-media:";

export async function blobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function")
    return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsArrayBuffer(blob);
  });
}

export function dataUrlBytes(value: string): {
  bytes: Uint8Array;
  mimeType: string;
} {
  const match = /^data:([a-z0-9.+/-]+);base64,([a-z0-9+/=\r\n]+)$/i.exec(value);
  if (!match) throw new Error("Arquivo incorporado inválido.");
  const binary = atob(match[2]);
  return {
    mimeType: match[1].toLowerCase(),
    bytes: Uint8Array.from(binary, (char) => char.charCodeAt(0)),
  };
}

export function bytesDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192)
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return `data:${mimeType};base64,${btoa(binary)}`;
}

export async function prepareMedia(
  bytes: Uint8Array,
  mimeType: string,
): Promise<StoredMedia> {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer);
  const hash = Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  // MIME is part of the identity so differently interpreted files cannot alias.
  return {
    id: `${hash}.${mimeType.replace(/[^a-z0-9]/gi, "_")}`,
    bytes,
    mimeType,
    sizeBytes: bytes.length,
    createdAt: new Date().toISOString(),
  };
}

export async function readStoredMedia(id: string): Promise<StoredMedia> {
  const db = await openDeviceDatabase();
  const tx = db.transaction("media", "readonly");
  const result = (await requestResult(tx.objectStore("media").get(id))) as
    StoredMedia | undefined;
  if (!result)
    throw new Error(
      "Este arquivo não foi encontrado neste aparelho. Restaure um backup que inclua os arquivos.",
    );
  return result;
}

export async function readMedia(id: string): Promise<Blob> {
  const item = await readStoredMedia(id);
  return new Blob([item.bytes.slice().buffer], { type: item.mimeType });
}

export async function mediaDataUrl(id: string) {
  const item = await readStoredMedia(id);
  return bytesDataUrl(item.bytes, item.mimeType);
}
