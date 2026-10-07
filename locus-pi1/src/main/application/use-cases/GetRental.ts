import { IRentalRepository } from "../../domain/repositories/IRentalRepository";

export class GetRental {
  constructor(private rentalRepository: IRentalRepository) {}

  async execute(id: string) {
    const rental = await this.rentalRepository.findById(id);
    if (!rental) throw new Error(`Rental with id ${id} not found`);
    return rental;
  }
}
