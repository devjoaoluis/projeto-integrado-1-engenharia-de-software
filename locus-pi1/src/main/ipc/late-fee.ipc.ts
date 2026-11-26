import { ipcMain } from "electron";
import { CalculateDailyLateFee, CalculateDailyLateFeeDTO } from "../application/use-cases/CalculateDailyLateFee";

export function registerLateFeeIpc() {
  const calculateDailyLateFee = new CalculateDailyLateFee();

  ipcMain.handle("late-fee:calculate", async (_, data: CalculateDailyLateFeeDTO) => {
    return calculateDailyLateFee.execute(data);
  });
}
