import { guarantors } from "../database/schema/contacts";
import { DrizzleContactRepository } from "./DrizzleContactRepository";
import { IGuarantorRepository } from "../../domain/repositories/IGuarantorRepository";

export class DrizzleGuarantorRepository extends DrizzleContactRepository implements IGuarantorRepository {
  constructor() { super(guarantors); }
}
