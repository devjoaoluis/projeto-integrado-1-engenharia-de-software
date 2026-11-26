import { randomUUID } from "node:crypto";
import { z } from "zod";
import { IContractTemplateRepository } from "../../domain/repositories/IContractTemplateRepository";

const schema = z.object({
  name: z.string().trim().min(1),
  content: z.string().refine(value => value.trim().length > 0, { message: "O conteúdo do modelo é obrigatório." }),
}).strict();
export type CreateContractTemplateDTO = z.input<typeof schema>;

export class CreateContractTemplate {
  constructor(private templateRepository: IContractTemplateRepository) {}
  async execute(input: CreateContractTemplateDTO) {
    const data = schema.parse(input);
    const now = Date.now();
    // Keep the supplied text and placeholders unchanged; rendering belongs to HU11 items 2 and 3.
    return this.templateRepository.create({ id: randomUUID(), name: data.name, content: data.content,
      createdAt: now, updatedAt: now });
  }
}
