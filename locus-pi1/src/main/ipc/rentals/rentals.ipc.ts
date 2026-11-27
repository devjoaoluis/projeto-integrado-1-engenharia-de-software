import { UpdateRentalPrerequisites, UpdateRentalPrerequisitesDTO } from "../../application/use-cases/UpdateRentalPrerequisites";
import { ipcMain, shell } from "electron";
import path from "node:path";
import { CreateRental, CreateRentalDTO } from "../../application/use-cases/CreateRental";
import { GetRental } from "../../application/use-cases/GetRental";
import { ListRentals } from "../../application/use-cases/ListRentals";
import { ReleaseRentalKeys } from "../../application/use-cases/ReleaseRentalKeys";
import { DrizzleRentalRepository } from "../../infrastructure/repositories/DrizzleRentalRepository";
import { DrizzlePropertyRepository } from "../../infrastructure/repositories/DrizzlePropertyRepository";
import { DrizzleClientRepository } from "../../infrastructure/repositories/DrizzleClientRepository";
import { DrizzleInspectionRepository } from "../../infrastructure/repositories/DrizzleInspectionRepository";
import { DrizzlePropertyHistoryRepository } from "../../infrastructure/repositories/DrizzlePropertyHistoryRepository";
import { CancelRental, CancelRentalOptions } from "../../application/use-cases/CancelRental";
import { GetRentalTerminationSummary } from "../../application/use-cases/GetRentalTerminationSummary";
import { TerminateRental, TerminateRentalDTO } from "../../application/use-cases/TerminateRental";
import { ListPayments } from "../../application/use-cases/ListPayments";
import { SettleRentalInstallment, SettleRentalInstallmentInput } from "../../application/use-cases/SettleRentalInstallment";
import { LocalFileStorage } from "../../infrastructure/filesystem/LocalFileStorage";
import { DrizzleFinancialRepository } from "../../infrastructure/repositories/DrizzleFinancialRepository";
import { UpdateFinancialSettings } from "../../application/use-cases/UpdateFinancialSettings";
import { UpdateContractFinancialSettings } from "../../application/use-cases/UpdateContractFinancialSettings";
import { CreateInstallmentItem, CreateInstallmentItemInput } from "../../application/use-cases/CreateInstallmentItem";
import { VoidInstallmentItem } from "../../application/use-cases/VoidInstallmentItem";
import {
  ContractFinancialSettingsUpdate,
  GlobalFinancialSettingsUpdate,
} from "../../domain/repositories/IFinancialRepository";
import { ReverseRentalPayment } from "../../application/use-cases/ReverseRentalPayment";
import { getCurrentSessionUserId } from "../auth/auth.ipc";

export function registerRentalsIpc() {
  const rentalRepo = new DrizzleRentalRepository();
  const propertyRepo = new DrizzlePropertyRepository();
  const clientRepo = new DrizzleClientRepository();
  const inspectionRepo = new DrizzleInspectionRepository();
  const historyRepo = new DrizzlePropertyHistoryRepository();
  const financialRepo = new DrizzleFinancialRepository();
  const fileStorage = new LocalFileStorage();
  ipcMain.handle("rentals:list-contract-history", async () => {
  return historyRepo.findAllContracts();
});

  const createRental = new CreateRental(rentalRepo, propertyRepo, clientRepo);
  const getRental = new GetRental(rentalRepo);
  const listRentals = new ListRentals(rentalRepo);
  const updatePrerequisites = new UpdateRentalPrerequisites(rentalRepo);
  const releaseKeys = new ReleaseRentalKeys(rentalRepo, inspectionRepo, historyRepo);
  const cancelRental = new CancelRental(rentalRepo, inspectionRepo, historyRepo);
  const getTerminationSummary = new GetRentalTerminationSummary(rentalRepo, historyRepo, inspectionRepo, clientRepo, propertyRepo);
  const terminateRental = new TerminateRental(rentalRepo, inspectionRepo, historyRepo, clientRepo, propertyRepo);
  const listPayments = new ListPayments(rentalRepo, historyRepo, clientRepo, propertyRepo, financialRepo);
  const settleRentalInstallment = new SettleRentalInstallment(rentalRepo, historyRepo, listPayments, fileStorage);
  const updateFinancialSettings = new UpdateFinancialSettings(financialRepo);
  const updateContractFinancialSettings = new UpdateContractFinancialSettings(financialRepo, historyRepo);
  const createInstallmentItem = new CreateInstallmentItem(financialRepo, historyRepo);
  const voidInstallmentItem = new VoidInstallmentItem(financialRepo, historyRepo);
  const reverseRentalPayment = new ReverseRentalPayment(historyRepo);

  ipcMain.handle("rentals:create", async (_, data: CreateRentalDTO) => createRental.execute(data));
  ipcMain.handle("rentals:get", async (_, id: string) => getRental.execute(id));
  ipcMain.handle("rentals:list", async () => listRentals.execute());
  ipcMain.handle("rentals:update-prerequisites", async (_, data: UpdateRentalPrerequisitesDTO) => updatePrerequisites.execute(data));
  ipcMain.handle("rentals:release-keys", async (_, id: string) => releaseKeys.execute(id));
  ipcMain.handle("rentals:get-termination-summary", async (_, id: string) => getTerminationSummary.execute(id));
  ipcMain.handle("rentals:terminate", async (_, data: TerminateRentalDTO | string) => terminateRental.execute(data));
  ipcMain.handle("rentals:cancel", async (_, id: string, options?: CancelRentalOptions) => {
    await terminateRental.execute({ rentalId: id, ...options });
    return { success: true };
  });

  ipcMain.handle("payments:list", async () => listPayments.execute());
  ipcMain.handle("payments:get-by-tenant", async (_, tenantId: string) => listPayments.execute(tenantId));
  ipcMain.handle("payments:settle-installment", async (_, input: SettleRentalInstallmentInput) =>
    settleRentalInstallment.execute({ ...input, createdBy: getCurrentSessionUserId() }),
  );
  ipcMain.handle("payments:undo", async (_, paymentId: string) =>
    reverseRentalPayment.execute(paymentId, getCurrentSessionUserId()),
  );
  ipcMain.handle("payments:get-settings", async () => financialRepo.getGlobalSettings());
  ipcMain.handle("payments:update-settings", async (_, settings: GlobalFinancialSettingsUpdate) =>
    updateFinancialSettings.execute({ ...settings, updatedBy: getCurrentSessionUserId() }),
  );
  ipcMain.handle("payments:update-contract-settings", async (_, contractId: string, settings: ContractFinancialSettingsUpdate) =>
    updateContractFinancialSettings.execute(contractId, { ...settings, updatedBy: getCurrentSessionUserId() }),
  );
  ipcMain.handle("payments:get-contract-settings", async (_, contractId: string) =>
    financialRepo.getContractSettings(contractId),
  );
  ipcMain.handle("payments:list-installment-items", async (_, contractId: string, referenceMonth?: string) =>
    financialRepo.listInstallmentItems(contractId, referenceMonth),
  );
  ipcMain.handle("payments:create-installment-item", async (_, input: CreateInstallmentItemInput) =>
    createInstallmentItem.execute({ ...input, createdBy: getCurrentSessionUserId() }),
  );
  ipcMain.handle("payments:void-installment-item", async (_, id: string, voidedBy?: string) =>
    voidInstallmentItem.execute(id, voidedBy),
  );
  ipcMain.handle("payments:open-receipt", async (_, paymentId: string) => {
    const payment = await historyRepo.findPaymentById?.(paymentId);
    if (!payment?.receiptPath) throw new Error("Este pagamento não possui comprovante vinculado.");
    const receiptRoot = path.resolve(fileStorage.getPath("payment-receipts", ""));
    const receiptPath = path.resolve(payment.receiptPath);
    if (!receiptPath.startsWith(`${receiptRoot}${path.sep}`) || !(await fileStorage.exists(receiptPath))) {
      throw new Error("O arquivo do comprovante não foi encontrado.");
    }
    const error = await shell.openPath(receiptPath);
    if (error) throw new Error(`Não foi possível abrir o comprovante: ${error}`);
    return { success: true };
  });
}
