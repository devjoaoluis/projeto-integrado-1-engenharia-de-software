import { ipcMain } from "electron";
import { CalculateDailyLateFee, CalculateDailyLateFeeDTO } from "../../application/use-cases/CalculateDailyLateFee";
import { DrizzleFinancialRepository } from "../../infrastructure/repositories/DrizzleFinancialRepository";

export function registerLateFeeIpc() {
  const calculateDailyLateFee = new CalculateDailyLateFee();
  const financialRepository = new DrizzleFinancialRepository();

  ipcMain.handle("late-fee:calculate", async (_, data: CalculateDailyLateFeeDTO) => {
    const settings = await financialRepository.getGlobalSettings();
    return calculateDailyLateFee.execute(data, settings);
  });
}
