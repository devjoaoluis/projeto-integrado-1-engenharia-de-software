import { ipcMain } from "electron";
import { CreateContractTemplate, CreateContractTemplateDTO } from "../application/use-cases/CreateContractTemplate";
import { GetContractTemplate } from "../application/use-cases/GetContractTemplate";
import { ListContractTemplates } from "../application/use-cases/ListContractTemplates";
import { DrizzleContractTemplateRepository } from "../infrastructure/repositories/DrizzleContractTemplateRepository";

export function registerContractTemplatesIpc() {
  const repository = new DrizzleContractTemplateRepository();
  const create = new CreateContractTemplate(repository);
  const get = new GetContractTemplate(repository);
  const list = new ListContractTemplates(repository);
  ipcMain.handle("contract-templates:create", (_, data: CreateContractTemplateDTO) => create.execute(data));
  ipcMain.handle("contract-templates:get", (_, id: string) => get.execute(id));
  ipcMain.handle("contract-templates:list", () => list.execute());
}
