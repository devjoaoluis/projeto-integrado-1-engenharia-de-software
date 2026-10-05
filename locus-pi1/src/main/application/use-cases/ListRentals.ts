import { IRentalRepository } from "../../domain/repositories/IRentalRepository";

export class ListRentals {
  constructor(private rentalRepository: IRentalRepository) {}

  async execute() {
    return this.rentalRepository.findAll();
  }
}
