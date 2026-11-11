import { IInspectionRepository } from "../../domain/repositories/IInspectionRepository";
import { requiredText } from "./contactValidation";

export class GetInspection {
  constructor(private inspectionRepository: IInspectionRepository) {}
  async execute(id: string) {
    const inspection = await this.inspectionRepository.findById(requiredText(id, "Inspection id"));
    if (!inspection) throw new Error("Vistoria não encontrada.");
    return inspection;
  }
}
