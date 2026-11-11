import { z } from "zod";
import { IInspectionRepository } from "../../domain/repositories/IInspectionRepository";
import { IPropertyRepository } from "../../domain/repositories/IPropertyRepository";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";

const schema = z.object({
  propertyId: z.string().trim().min(1).optional(),
  contractId: z.string().trim().min(1).optional(),
}).strict().refine(data => Boolean(data.propertyId) !== Boolean(data.contractId), {
  message: "Informe somente o imóvel ou somente o contrato para consultar vistorias.",
});
export type ListInspectionsDTO = z.input<typeof schema>;

export class ListInspections {
  constructor(
    private inspectionRepository: IInspectionRepository,
    private propertyRepository: IPropertyRepository,
    private historyRepository: IPropertyHistoryRepository,
  ) {}
  async execute(input: ListInspectionsDTO) {
    const data = schema.parse(input);
    if (data.propertyId) {
      if (!await this.propertyRepository.findById(data.propertyId)) throw new Error("Imóvel não encontrado.");
      return this.inspectionRepository.findByPropertyId(data.propertyId);
    }
    if (!await this.historyRepository.findContractById(data.contractId)) throw new Error("Contrato não encontrado.");
    return this.inspectionRepository.findByContractId(data.contractId);
  }
}
