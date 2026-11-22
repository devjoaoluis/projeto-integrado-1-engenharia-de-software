import { ipcMain, dialog } from "electron";
import fs from "node:fs/promises";
import { AssembleContractData, AssembleContractDataInput } from "../application/use-cases/AssembleContractData";
import { FillContractTemplate, FillContractTemplateInput } from "../application/use-cases/FillContractTemplate";
import { GenerateContractPdf, GenerateContractPdfInput } from "../application/use-cases/GenerateContractPdf";
import { DEFAULT_RENTAL_CONTRACT_TEMPLATE } from "../application/use-cases/defaultContractTemplate";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzleClientRepository } from "../infrastructure/repositories/DrizzleClientRepository";
import { DrizzleContactRepository } from "../infrastructure/repositories/DrizzleContactRepository";
import { DrizzleRentalRepository } from "../infrastructure/repositories/DrizzleRentalRepository";
import { DrizzleContractTemplateRepository } from "../infrastructure/repositories/DrizzleContractTemplateRepository";
import { owners, guarantors } from "../infrastructure/database/schema/contacts";

export interface ExportContractPdfParams {
  content: string;
  title?: string;
  defaultFileName?: string;
  targetPath?: string;
}

export function registerContractsIpc() {
  const propertyRepo = new DrizzlePropertyRepository();
  const clientRepo = new DrizzleClientRepository();
  const ownerRepo = new DrizzleContactRepository(owners);
  const guarantorRepo = new DrizzleContactRepository(guarantors);
  const rentalRepo = new DrizzleRentalRepository();
  const templateRepo = new DrizzleContractTemplateRepository();

  const assembleData = new AssembleContractData(
    propertyRepo,
    clientRepo,
    ownerRepo,
    guarantorRepo,
    rentalRepo,
    templateRepo
  );
  const fillTemplate = new FillContractTemplate();
  const generatePdf = new GenerateContractPdf();

  ipcMain.handle("contracts:assemble-data", async (_, input: AssembleContractDataInput) => {
    return assembleData.execute(input);
  });

  ipcMain.handle("contracts:fill-template", async (_, input: FillContractTemplateInput) => {
    return fillTemplate.execute(input);
  });

  ipcMain.handle("contracts:generate-pdf", async (_, input: GenerateContractPdfInput) => {
    const bytes = await generatePdf.execute(input);
    return {
      base64: Buffer.from(bytes).toString("base64"),
    };
  });

  ipcMain.handle("contracts:export-pdf", async (_, params: ExportContractPdfParams) => {
    const bytes = await generatePdf.execute({
      content: params.content,
      title: params.title,
    });
    const buffer = Buffer.from(bytes);

    if (params.targetPath) {
      await fs.writeFile(params.targetPath, buffer);
      return { success: true, filePath: params.targetPath };
    }

    const defaultName = params.defaultFileName || (params.title ? `${params.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf` : "Contrato_Locacao.pdf");
    const result = await dialog.showSaveDialog({
      title: "Salvar Contrato em PDF",
      defaultPath: defaultName,
      filters: [{ name: "Documentos PDF (*.pdf)", extensions: ["pdf"] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    await fs.writeFile(result.filePath, buffer);
    return { success: true, filePath: result.filePath };
  });

  ipcMain.handle("contracts:get-default-template", async () => {
    return DEFAULT_RENTAL_CONTRACT_TEMPLATE;
  });
}
