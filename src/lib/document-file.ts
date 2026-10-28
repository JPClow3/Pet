import {
  MAX_DOCUMENT_BYTES,
  type DocumentMimeType,
  type PetDocument,
} from "@/lib/domain/document";

const extensions: Record<DocumentMimeType, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function safeDocumentFileName(
  name: string,
  mimeType: DocumentMimeType,
): string {
  let stem = (name.split(/[\\/]/).pop() ?? "documento")
    .replace(/[<>:"|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\.[^.]*$/, "")
    .replace(/[. ]+$/, "")
    .trim();
  if (!stem || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem))
    stem = "documento";
  return `${stem.slice(0, 120)}${extensions[mimeType]}`;
}

async function readHead(blob: Blob): Promise<Uint8Array> {
  const head = blob.slice(0, 32);
  if (typeof head.arrayBuffer === "function")
    return new Uint8Array(await head.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () =>
      reject(
        new Error("Não foi possível ler o arquivo. Selecione-o novamente."),
      );
    reader.onabort = () =>
      reject(new Error("A leitura do arquivo foi interrompida."));
    reader.readAsArrayBuffer(head);
  });
}

function detectMime(bytes: Uint8Array): DocumentMimeType | null {
  const matches = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);
  if (matches([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (matches([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matches([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  if (
    matches([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    matches([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  )
    return "image/gif";
  if (matches([0x52, 0x49, 0x46, 0x46]) && matches([0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  return null;
}

export async function validateDocumentFile(
  file: Blob,
  name = "documento",
): Promise<{
  mimeType: DocumentMimeType;
  sizeBytes: number;
  fileName: string;
}> {
  if (!file.size)
    throw new Error("O arquivo está vazio. Escolha outro arquivo.");
  if (file.size > MAX_DOCUMENT_BYTES)
    throw new Error("Escolha um arquivo de até 10 MB.");
  const mimeType = detectMime(await readHead(file));
  if (
    !mimeType ||
    (file.type &&
      file.type !== "application/octet-stream" &&
      file.type.toLowerCase() !== mimeType)
  ) {
    throw new Error(
      "Escolha um PDF ou uma imagem JPG, PNG, WebP ou GIF válida.",
    );
  }
  return {
    mimeType,
    sizeBytes: file.size,
    fileName: safeDocumentFileName(name, mimeType),
  };
}

/** Download as an attachment; documents are never injected into app HTML. */
export async function downloadDocumentFile(
  blob: Blob,
  item: PetDocument,
): Promise<void> {
  const info = await validateDocumentFile(blob, item.fileName);
  if (info.sizeBytes !== item.sizeBytes || info.mimeType !== item.mimeType) {
    throw new Error(
      "Este arquivo não corresponde aos dados salvos. Restaure uma cópia de segurança.",
    );
  }
  const url = URL.createObjectURL(new Blob([blob], { type: info.mimeType }));
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = info.fileName;
    anchor.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
}
