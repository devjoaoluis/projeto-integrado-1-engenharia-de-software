import { IRentalRepository } from "../../domain/repositories/IRentalRepository";

export class CancelRental {
  constructor(private rentalRepository: IRentalRepository) {}

  async execute(id: string): Promise<void> {
    if (typeof id !== "string" || !id.trim()) throw new Error("Rental id is required");
    if (!this.rentalRepository.cancel) throw new Error("Rental cancellation is not supported");
    await this.rentalRepository.cancel(id, Date.now());
  }
}
