import { desc, eq } from "drizzle-orm";
import { db } from "../database/db";
import { contractTemplates } from "../database/schema/contract-templates";
import { ContractTemplate } from "../../domain/entities/ContractTemplate";
import { IContractTemplateRepository } from "../../domain/repositories/IContractTemplateRepository";

export class DrizzleContractTemplateRepository implements IContractTemplateRepository {
  async create(template: ContractTemplate): Promise<ContractTemplate> {
    await db.insert(contractTemplates).values(template);
    return template;
  }
  async findById(id: string): Promise<ContractTemplate | null> {
    return (await db.select().from(contractTemplates).where(eq(contractTemplates.id, id)).get()) ?? null;
  }
  async findAll(): Promise<ContractTemplate[]> {
    return db.select().from(contractTemplates).orderBy(desc(contractTemplates.createdAt), contractTemplates.id);
  }
}
