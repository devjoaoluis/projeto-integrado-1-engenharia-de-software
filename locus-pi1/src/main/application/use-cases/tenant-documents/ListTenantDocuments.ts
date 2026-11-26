import { z } from "zod";
import { TenantDocument } from "../../../domain/entities/TenantDocument";
import { ITenantDocumentRepository } from "../../../domain/repositories/ITenantDocumentRepository";
import { IClientRepository } from "../../../domain/repositories/IClientRepository";

const listSchema = z.object({
  locatarioId: z.string().trim().min(1, "O ID do locatário é obrigatório."),
});

export type ListTenantDocumentsDTO = z.infer<typeof listSchema>;

export class ListTenantDocuments {
  constructor(
    private documentRepository: ITenantDocumentRepository,
    private clientRepository: IClientRepository
  ) {}

  async execute(input: ListTenantDocumentsDTO): Promise<TenantDocument[]> {
    const data = listSchema.parse(input);

    const client = await this.clientRepository.findById(data.locatarioId);
    if (!client) {
      throw new Error("Locatário não encontrado.");
    }

    return this.documentRepository.findByLocatarioId(data.locatarioId);
  }
}
