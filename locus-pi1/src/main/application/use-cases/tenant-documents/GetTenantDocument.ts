import { z } from "zod";
import { ITenantDocumentRepository } from "../../../domain/repositories/ITenantDocumentRepository";
import { ITenantDocumentStorage } from "../../../domain/repositories/ITenantDocumentStorage";

const getSchema = z.object({
  id: z.string().trim().min(1, "O ID do documento é obrigatório."),
});

export type GetTenantDocumentDTO = z.infer<typeof getSchema>;

export interface GetTenantDocumentResult {
  mimeType: string;
  nomeOriginal: string;
  conteudo: Uint8Array;
}

export class GetTenantDocument {
  constructor(
    private documentRepository: ITenantDocumentRepository,
    private storage: ITenantDocumentStorage
  ) {}

  async execute(input: GetTenantDocumentDTO): Promise<GetTenantDocumentResult> {
    const data = getSchema.parse(input);

    const doc = await this.documentRepository.findById(data.id);
    if (!doc) {
      throw new Error("Documento não encontrado.");
    }

    const buffer = await this.storage.read(doc.caminhoArquivo);

    return {
      mimeType: doc.mimeType,
      nomeOriginal: doc.nomeOriginal,
      conteudo: new Uint8Array(buffer),
    };
  }
}
