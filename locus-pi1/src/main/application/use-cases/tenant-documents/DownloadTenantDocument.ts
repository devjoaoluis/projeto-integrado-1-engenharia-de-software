import path from "node:path";
import { dialog } from "electron";
import { z } from "zod";
import { ITenantDocumentRepository } from "../../../domain/repositories/ITenantDocumentRepository";
import { ITenantDocumentStorage } from "../../../domain/repositories/ITenantDocumentStorage";

const downloadSchema = z.object({
  id: z.string().trim().min(1, "O ID do documento é obrigatório."),
});

export type DownloadTenantDocumentDTO = z.infer<typeof downloadSchema>;

export interface DownloadTenantDocumentResult {
  salvo: boolean;
  destino?: string;
}

export type SaveDialogFunction = (
  suggestedName: string,
  ext: string
) => Promise<{ canceled: boolean; filePath?: string }>;

export class DownloadTenantDocument {
  constructor(
    private documentRepository: ITenantDocumentRepository,
    private storage: ITenantDocumentStorage,
    private saveDialogFn?: SaveDialogFunction
  ) {}

  async execute(input: DownloadTenantDocumentDTO): Promise<DownloadTenantDocumentResult> {
    const data = downloadSchema.parse(input);

    const doc = await this.documentRepository.findById(data.id);
    if (!doc) {
      throw new Error("Documento não encontrado.");
    }

    const fileExists = await this.storage.exists(doc.caminhoArquivo);
    if (!fileExists) {
      throw new Error("ARQUIVO_NAO_ENCONTRADO: Arquivo não encontrado no disco.");
    }

    const ext = path.extname(doc.nomeOriginal).replace(".", "");

    let dialogResult: { canceled: boolean; filePath?: string };
    if (this.saveDialogFn) {
      dialogResult = await this.saveDialogFn(doc.nomeOriginal, ext);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const electron = require("electron");
      const dialogInstance = electron.dialog || dialog;
      if (!dialogInstance?.showSaveDialog) {
        return { salvo: false };
      }
      dialogResult = await dialogInstance.showSaveDialog({
        title: "Salvar Documento do Locatário",
        defaultPath: doc.nomeOriginal,
        filters: [
          { name: "Documento", extensions: [ext] },
          { name: "Todos os Arquivos", extensions: ["*"] },
        ],
      });
    }

    if (dialogResult.canceled || !dialogResult.filePath) {
      return { salvo: false };
    }

    await this.storage.copyTo(doc.caminhoArquivo, dialogResult.filePath);

    return {
      salvo: true,
      destino: dialogResult.filePath,
    };
  }
}
