import { randomUUID } from "node:crypto";
import { IContractTemplateRepository } from "../../domain/repositories/IContractTemplateRepository";
import { ContractTemplate } from "../../domain/entities/ContractTemplate";
import { BUILTIN_CONTRACT_TEMPLATES } from "./defaultContractTemplate";

export class SeedBuiltinContractTemplates {
  constructor(private templateRepository: IContractTemplateRepository) {}

  async execute(): Promise<ContractTemplate[]> {
    const existing = await this.templateRepository.findAll();
    const created: ContractTemplate[] = [];
    const now = Date.now();

    for (const builtin of BUILTIN_CONTRACT_TEMPLATES) {
      const alreadyExists = existing.some(
        (e: ContractTemplate) =>
          e.name.toLowerCase().trim() === builtin.name.toLowerCase().trim() || e.id === builtin.id
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
