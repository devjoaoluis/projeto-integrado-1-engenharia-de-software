import { IContractTemplateRepository } from "../../domain/repositories/IContractTemplateRepository";
import { requiredText } from "./contactValidation";

export class GetContractTemplate {
  constructor(private templateRepository: IContractTemplateRepository) {}
  async execute(id: string) {
    const template = await this.templateRepository.findById(requiredText(id, "Template id"));
    if (!template) throw new Error("Modelo de contrato não encontrado.");
    return template;
  }
}
