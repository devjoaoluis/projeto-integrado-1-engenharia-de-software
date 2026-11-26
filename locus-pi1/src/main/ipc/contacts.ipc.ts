import { dialog, ipcMain } from "electron";
import fs from "node:fs";
import { CreateContact, CreateContactDTO } from "../application/use-cases/CreateContact";
import { UpdateContact, UpdateContactDTO } from "../application/use-cases/UpdateContact";
import { GetContact } from "../application/use-cases/GetContact";
import { ListContacts } from "../application/use-cases/ListContacts";
import { DeleteContact } from "../application/use-cases/DeleteContact";
import { GetOwnerPayoutReport, GetOwnerPayoutReportInput } from "../application/use-cases/GetOwnerPayoutReport";
import { GenerateOwnerPayoutPdf } from "../application/use-cases/GenerateOwnerPayoutPdf";
import { DrizzleOwnerRepository } from "../infrastructure/repositories/DrizzleOwnerRepository";
import { DrizzleGuarantorRepository } from "../infrastructure/repositories/DrizzleGuarantorRepository";
import { DrizzlePropertyRepository } from "../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzlePropertyHistoryRepository } from "../infrastructure/repositories/DrizzlePropertyHistoryRepository";
import { DrizzleClientRepository } from "../infrastructure/repositories/DrizzleClientRepository";

export interface ExportOwnerPayoutPdfParams extends GetOwnerPayoutReportInput {
  targetPath?: string;
  defaultFileName?: string;
}

export function registerContactsIpc() {
  const ownerRepo = new DrizzleOwnerRepository();
  const guarantorRepo = new DrizzleGuarantorRepository();
  const propertyRepo = new DrizzlePropertyRepository();
  const historyRepo = new DrizzlePropertyHistoryRepository();
  const clientRepo = new DrizzleClientRepository();

  const getOwnerPayoutReport = new GetOwnerPayoutReport(
    ownerRepo,
    propertyRepo,
    historyRepo,
    clientRepo
  );
  const generateOwnerPayoutPdf = new GenerateOwnerPayoutPdf();

  for (const [channel, repository] of [
    ["owners", ownerRepo],
    ["guarantors", guarantorRepo],
  ] as const) {
    const create = new CreateContact(repository);
    const update = new UpdateContact(repository);
    const get = new GetContact(repository);
    const list = new ListContacts(repository);
    const remove = new DeleteContact(repository);
    ipcMain.handle(`${channel}:create`, async (_, data: CreateContactDTO) => create.execute(data));
    ipcMain.handle(`${channel}:update`, async (_, data: UpdateContactDTO) => update.execute(data));
    ipcMain.handle(`${channel}:get`, async (_, id: string) => get.execute(id));
    ipcMain.handle(`${channel}:list`, async () => list.execute());
    ipcMain.handle(`${channel}:delete`, async (_, id: string) => { await remove.execute(id); return { success: true }; });
  }

  // Handlers da HU-16: Relatório de Repasse ao Proprietário (RF18)
  ipcMain.handle("owners:get-payout-report", async (_, params: GetOwnerPayoutReportInput) => {
    return await getOwnerPayoutReport.execute(params);
  });

  ipcMain.handle("owners:generate-payout-pdf", async (_, params: GetOwnerPayoutReportInput) => {
    const report = await getOwnerPayoutReport.execute(params);
    return await generateOwnerPayoutPdf.execute(report);
  });

  ipcMain.handle("owners:export-payout-pdf", async (_, params: ExportOwnerPayoutPdfParams) => {
    const report = await getOwnerPayoutReport.execute(params);
    const pdfBytes = await generateOwnerPayoutPdf.execute(report);

    let targetPath = params.targetPath;
    if (!targetPath) {
      const sanitizedName = (report.owner.name || "Proprietario").replace(/[^a-zA-Z0-9_-]/g, "_");
      const sanitizedRef = report.referenceMonth.replace(/[^a-zA-Z0-9_-]/g, "_");
      const defaultName = params.defaultFileName || `Relatorio_Repasse_${sanitizedName}_${sanitizedRef}.pdf`;

      if (dialog && typeof dialog.showSaveDialog === "function") {
        const result = await dialog.showSaveDialog({
          title: "Salvar Relatório de Repasse ao Proprietário",
          defaultPath: defaultName,
          filters: [{ name: "Documentos PDF (*.pdf)", extensions: ["pdf"] }],
        });
        if (result.canceled || !result.filePath) {
          return { canceled: true };
        }
        targetPath = result.filePath;
      } else {
        targetPath = defaultName;
      }
    }

    await fs.promises.writeFile(targetPath, Buffer.from(pdfBytes));
    return { success: true, filePath: targetPath, report };
  });

  // Alias para repasses:*
  ipcMain.handle("repasses:get-report", async (_, params: GetOwnerPayoutReportInput) => {
    return await getOwnerPayoutReport.execute(params);
  });
  ipcMain.handle("repasses:generate-pdf", async (_, params: GetOwnerPayoutReportInput) => {
    const report = await getOwnerPayoutReport.execute(params);
    return await generateOwnerPayoutPdf.execute(report);
  });
  ipcMain.handle("repasses:export-pdf", async (_, params: ExportOwnerPayoutPdfParams) => {
    const report = await getOwnerPayoutReport.execute(params);
    const pdfBytes = await generateOwnerPayoutPdf.execute(report);
    let targetPath = params.targetPath;
    if (!targetPath) {
      const sanitizedName = (report.owner.name || "Proprietario").replace(/[^a-zA-Z0-9_-]/g, "_");
      const sanitizedRef = report.referenceMonth.replace(/[^a-zA-Z0-9_-]/g, "_");
      targetPath = params.defaultFileName || `Relatorio_Repasse_${sanitizedName}_${sanitizedRef}.pdf`;
    }
    await fs.promises.writeFile(targetPath, Buffer.from(pdfBytes));
    return { success: true, filePath: targetPath, report };
  });
}
