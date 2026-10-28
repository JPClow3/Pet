import { z } from "zod";
import { id, isoDate, isoDateTime } from "./schema";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_CATEGORIES = [
  "exame",
  "receita",
  "vacinacao",
  "identificacao",
  "outro",
] as const;
export const documentCategorySchema = z.enum(DOCUMENT_CATEGORIES);
export const documentCategoryLabels: Record<DocumentCategory, string> = {
  exame: "Exames",
  receita: "Receitas",
  vacinacao: "Vacinação",
  identificacao: "Identificação",
  outro: "Outros",
};
export const documentMimeTypeSchema = z.enum([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
export type DocumentCategory = z.infer<typeof documentCategorySchema>;
export type DocumentMimeType = z.infer<typeof documentMimeTypeSchema>;

export const documentMetadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Dê um nome ao documento.")
    .max(100, "Use até 100 caracteres no nome."),
  category: documentCategorySchema,
  date: isoDate.nullable(),
  notes: z
    .string()
    .trim()
    .max(600, "Use até 600 caracteres nas observações.")
    .nullable(),
});

export const petDocumentSchema = documentMetadataSchema.extend({
  id,
  petId: id,
  mediaId: id,
  fileName: z
    .string()
    .min(1)
    .max(140)
    .refine(
      (value) => !/[\\/\u0000-\u001f\u007f]/.test(value),
      "Nome de arquivo inválido.",
    ),
  mimeType: documentMimeTypeSchema,
  sizeBytes: z.number().int().positive().max(MAX_DOCUMENT_BYTES),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.nullable(),
});

export type PetDocument = z.infer<typeof petDocumentSchema>;
export type NewDocumentInput = Omit<
  PetDocument,
  | "id"
  | "mediaId"
  | "mimeType"
  | "sizeBytes"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
>;
export type DocumentPatch = z.infer<typeof documentMetadataSchema>;

export function formatDocumentSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
