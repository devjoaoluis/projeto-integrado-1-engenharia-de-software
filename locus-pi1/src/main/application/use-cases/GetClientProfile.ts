import { IClientRepository } from "../../domain/repositories/IClientRepository";
import { IGuarantorRepository } from "../../domain/repositories/IGuarantorRepository";
import { GetClient } from "./GetClient";
import { requiredText } from "./contactValidation";

export class GetClientProfile {
  constructor(private clientRepository: IClientRepository, private guarantorRepository: IGuarantorRepository) {}

  async execute(id: string) {
    requiredText(id, "Client id");
    const client = await new GetClient(this.clientRepository).execute(id);
    const guarantor = client.guarantorId ? await this.guarantorRepository.findById(client.guarantorId) : null;
    return { client, guarantor };
  }
}
