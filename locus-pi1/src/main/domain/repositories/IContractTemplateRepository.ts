import { ContractTemplate } from "../entities/ContractTemplate";

export interface IContractTemplateRepository {
  create(template: ContractTemplate): Promise<ContractTemplate>;
  findById(id: string): Promise<ContractTemplate | null>;
  findAll(): Promise<ContractTemplate[]>;
}
