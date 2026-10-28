import { describe, expect, it } from "vitest";
import { safeDocumentFileName, validateDocumentFile } from "./document-file";
import { MAX_DOCUMENT_BYTES } from "./domain/document";

describe("arquivos de documentos", () => {
  it("aceita PDF original e infere o tipo quando o navegador não informa", async () => {
    const file = new Blob(["%PDF-1.7\nconteúdo de teste"]);
    await expect(validateDocumentFile(file, "exame.pdf")).resolves.toEqual({
      mimeType: "application/pdf",
      sizeBytes: file.size,
      fileName: "exame.pdf",
    });
  });
  it.each([
    ["image/jpeg", [255, 216, 255]],
    ["image/png", [137, 80, 78, 71, 13, 10, 26, 10]],
    ["image/gif", [71, 73, 70, 56, 57, 97]],
    ["image/webp", [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]],
  ])("valida a assinatura de %s", async (type, signature) => {
    await expect(
      validateDocumentFile(
        new Blob([new Uint8Array(signature as number[])], {
          type: type as string,
        }),
      ),
    ).resolves.toMatchObject({ mimeType: type });
  });
  it("recusa um HTML renomeado, tipo divergente, arquivo vazio e arquivo grande", async () => {
    await expect(
      validateDocumentFile(
        new Blob(["<script>unsafe</script>"], { type: "application/pdf" }),
        "exame.pdf",
      ),
    ).rejects.toThrow("válida");
    await expect(
      validateDocumentFile(new Blob(["%PDF-1.7"], { type: "image/png" })),
    ).rejects.toThrow("válida");
    await expect(validateDocumentFile(new Blob([]))).rejects.toThrow("vazio");
    await expect(
      validateDocumentFile(new Blob([new Uint8Array(MAX_DOCUMENT_BYTES + 1)])),
    ).rejects.toThrow("10 MB");
  });
  it("gera nomes de download sem caminhos, extensões falsas ou controles", () => {
    expect(
      safeDocumentFileName("C:\\secret\\exame.exe", "application/pdf"),
    ).toBe("exame.pdf");
    expect(safeDocumentFileName("../CON.pdf", "application/pdf")).toBe(
      "documento.pdf",
    );
    expect(safeDocumentFileName("laudo\u202e.exe", "image/png")).toBe(
      "laudo.png",
    );
    expect(
      safeDocumentFileName("a".repeat(200) + ".pdf", "application/pdf").length,
    ).toBeLessThanOrEqual(140);
  });
});
