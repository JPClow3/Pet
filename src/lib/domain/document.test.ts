import { describe, expect, it } from "vitest";
import {
  documentMetadataSchema,
  MAX_DOCUMENT_BYTES,
  petDocumentSchema,
} from "./document";

const document = {
  id: "doc",
  petId: "luna",
  mediaId: "media-1",
  title: "Exame",
  category: "exame",
  date: "2026-10-25",
  notes: null,
  fileName: "exame.pdf",
  mimeType: "application/pdf",
  sizeBytes: 10,
  createdAt: "2026-10-25T12:00:00Z",
  updatedAt: "2026-10-25T12:00:00Z",
  deletedAt: null,
};

describe("documentos independentes", () => {
  it("valida metadados sem exigir vínculo a um cuidado e mantém exclusão recuperável", () => {
    expect(petDocumentSchema.parse(document)).toEqual(document);
    expect(
      petDocumentSchema.parse({
        ...document,
        deletedAt: "2026-10-25T13:00:00Z",
      }).mediaId,
    ).toBe("media-1");
    expect(
      documentMetadataSchema.parse({
        title: "  Receita  ",
        category: "receita",
        date: null,
        notes: null,
      }).title,
    ).toBe("Receita");
  });
  it("recusa datas inválidas, arquivo excessivo e metadados inseguros", () => {
    for (const patch of [
      { date: "2026-02-30" },
      { sizeBytes: 0 },
      { sizeBytes: MAX_DOCUMENT_BYTES + 1 },
      { mimeType: "text/html" },
      { fileName: "../arquivo.pdf" },
      { title: "   " },
    ]) {
      expect(
        petDocumentSchema.safeParse({ ...document, ...patch }).success,
      ).toBe(false);
    }
  });
});
