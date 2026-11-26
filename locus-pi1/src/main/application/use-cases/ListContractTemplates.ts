import { IContractTemplateRepository } from "../../domain/repositories/IContractTemplateRepository";

export class ListContractTemplates {
  constructor(private templateRepository: IContractTemplateRepository) {}
  async execute() { return this.templateRepository.findAll(); }
}
