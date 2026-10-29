import { z } from "zod";
import {
  TenantDocument,
  DOCUMENT_CATEGORIES,
} from "../../../domain/entities/TenantDocument";
import { ITenantDocumentRepository } from "../../../domain/repositories/ITenantDocumentRepository";

const updateCategorySchema = z.object({
  id: z.string().trim().min(1, "O ID do documento é obrigatório."),
  categoria: z.enum(DOCUMENT_CATEGORIES),
});

export type UpdateTenantDocumentCategoryDTO = z.infer<typeof updateCategorySchema>;

export class UpdateTenantDocumentCategory {
  constructor(private documentRepository: ITenantDocumentRepository) {}

  async execute(input: UpdateTenantDocumentCategoryDTO): Promise<TenantDocument> {
    const data = updateCategorySchema.parse(input);

    const doc = await this.documentRepository.findById(data.id);
    if (!doc) {
      throw new Error("Documento não encontrado.");
    }

    return this.documentRepository.updateCategoria(data.id, data.categoria);
  }
}
