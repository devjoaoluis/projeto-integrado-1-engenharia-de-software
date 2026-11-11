import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import {
  TenantDocument,
  DOCUMENT_CATEGORIES,
  DocumentCategory,
} from "../../../domain/entities/TenantDocument";
import { ITenantDocumentRepository } from "../../../domain/repositories/ITenantDocumentRepository";
import { ITenantDocumentStorage } from "../../../domain/repositories/ITenantDocumentStorage";
import { IClientRepository } from "../../../domain/repositories/IClientRepository";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const uploadSchema = z.object({
  locatarioId: z.string().trim().min(1, "O ID do locatário é obrigatório."),
  nomeArquivo: z.string().trim().min(1, "O nome do arquivo é obrigatório."),
  conteudo: z.union([z.instanceof(Uint8Array), z.custom<Buffer>((val) => Buffer.isBuffer(val))]),
  categoria: z.enum(DOCUMENT_CATEGORIES).optional(),
  mimeType: z.string().optional(),
});

export type UploadTenantDocumentDTO = z.infer<typeof uploadSchema>;

interface FormatDefinition {
  expectedMime: string;
  checkMagicBytes: (buf: Buffer) => boolean;
}

const SUPPORTED_FORMATS: Record<string, FormatDefinition> = {
  ".pdf": {
    expectedMime: "application/pdf",
    checkMagicBytes: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46, // %PDF
  },
  ".jpg": {
    expectedMime: "image/jpeg",
    checkMagicBytes: (buf) =>
      buf.length >= 3 &&
      buf[0] === 0xff &&
      buf[1] === 0xd8 &&
      buf[2] === 0xff, // FF D8 FF
  },
  ".jpeg": {
    expectedMime: "image/jpeg",
    checkMagicBytes: (buf) =>
      buf.length >= 3 &&
      buf[0] === 0xff &&
      buf[1] === 0xd8 &&
      buf[2] === 0xff, // FF D8 FF
  },
  ".png": {
    expectedMime: "image/png",
    checkMagicBytes: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47, // 89 50 4E 47
  },
};

export class UploadTenantDocument {
  constructor(
    private documentRepository: ITenantDocumentRepository,
    private clientRepository: IClientRepository,
    private storage: ITenantDocumentStorage
  ) {}

  async execute(input: UploadTenantDocumentDTO): Promise<TenantDocument> {
    const data = uploadSchema.parse(input);
    const buffer = Buffer.isBuffer(data.conteudo) ? data.conteudo : Buffer.from(data.conteudo);

    if (buffer.length === 0) {
      throw new Error("O arquivo enviado está vazio.");
    }
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error("O arquivo excede o limite máximo permitido de 10 MB.");
    }

    // 1. Sanitizar nome do arquivo e proteger contra path traversal
    const sanitized = path
      .basename(data.nomeArquivo)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/[/\\]/g, "")
      .replace(/\.{2,}/g, ".")
      .trim();

    if (!sanitized || sanitized.length > 255) {
      throw new Error("Nome de arquivo inválido.");
    }

    // 2. Três camadas de validação: Extensão, MimeType e Magic Bytes
    const ext = path.extname(sanitized).toLowerCase();
    const format = SUPPORTED_FORMATS[ext];
    if (!format) {
      throw new Error("Formato não suportado. Aceita apenas PDF, JPG/JPEG e PNG.");
    }

    if (data.mimeType && data.mimeType.toLowerCase() !== format.expectedMime) {
      throw new Error("Divergência entre a extensão do arquivo e o tipo MIME informado.");
    }

    if (!format.checkMagicBytes(buffer)) {
      throw new Error("Conteúdo do arquivo não corresponde ao formato declarado (magic bytes inválidos).");
    }

    // 3. Confirmar que o locatário existe no banco
    const client = await this.clientRepository.findById(data.locatarioId);
    if (!client) {
      throw new Error("Locatário não encontrado.");
    }

    // 4. Salvar arquivo no disco de forma consistente
    const id = randomUUID();
    const fileName = `${id}${ext}`;
    const caminhoArquivo = await this.storage.save(data.locatarioId, fileName, buffer);

    const document: TenantDocument = {
      id,
      locatarioId: data.locatarioId,
      nomeOriginal: sanitized,
      caminhoArquivo,
      mimeType: format.expectedMime,
      tamanhoBytes: buffer.length,
      categoria: (data.categoria || "outros") as DocumentCategory,
      criadoEm: Date.now(),
    };

    // 5. Inserir metadados no banco com rollback do arquivo em caso de erro
    try {
      return await this.documentRepository.create(document);
    } catch (err) {
      await this.storage.delete(caminhoArquivo).catch((cleanupErr) => {
        console.error("Falha ao remover arquivo após erro no banco:", cleanupErr);
      });
      throw err;
    }
  }
}
