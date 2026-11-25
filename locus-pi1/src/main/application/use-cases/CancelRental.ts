import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IInspectionRepository } from "../../domain/repositories/IInspectionRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { TerminateRental } from "./TerminateRental";

export interface CancelRentalOptions {
  cancelledAt?: number;
  allowPendingDebts?: boolean;
  notes?: string | null;
  hasDebts?: boolean;
}

export class CancelRental {
  private terminateRental: TerminateRental;

  constructor(
    private rentalRepository: IRentalRepository,
    private inspectionRepository?: IInspectionRepository,
    private historyRepository?: IPropertyHistoryRepository,
  ) {
    this.terminateRental = new TerminateRental(
      rentalRepository,
      inspectionRepository,
      historyRepository
    );
  }

  async execute(id: string, options?: CancelRentalOptions): Promise<void> {
    if (typeof id !== "string" || !id.trim())
      throw new Error("Rental id is required");

    await this.terminateRental.execute({
      rentalId: id,
      cancelledAt: options?.cancelledAt,
      allowPendingDebts: options?.allowPendingDebts,
      notes: options?.notes,
      hasDebts: options?.hasDebts,
    });
  }
}
