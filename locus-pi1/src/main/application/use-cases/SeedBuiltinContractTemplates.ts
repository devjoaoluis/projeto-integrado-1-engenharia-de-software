import { ContractTemplate } from "../../domain/entities/ContractTemplate";
import { IContractTemplateRepository } from "../../domain/repositories/IContractTemplateRepository";
import { BUILTIN_CONTRACT_TEMPLATES } from "./defaultContractTemplate";

/**
 * Populates built-in contract templates idempotently without duplicating existing entries.
 */
export class SeedBuiltinContractTemplates {
  constructor(private templateRepository: IContractTemplateRepository) {}

  async execute(): Promise<ContractTemplate[]> {
    const existing = await this.templateRepository.findAll();
    const created: ContractTemplate[] = [];
    const now = Date.now();

    for (const builtin of BUILTIN_CONTRACT_TEMPLATES) {
      const normalizedBuiltinName = builtin.name.toLowerCase().trim();
      const alreadyExists = existing.some(
        (entry) => entry.id === builtin.id || entry.name.toLowerCase().trim() === normalizedBuiltinName
      );

      if (!alreadyExists) {
        const item = await this.templateRepository.create({
          id: builtin.id,
          name: builtin.name,
          content: builtin.content,
          createdAt: now,
          updatedAt: now,
        });
        created.push(item);
      }
    }

    return created;
  }
}
