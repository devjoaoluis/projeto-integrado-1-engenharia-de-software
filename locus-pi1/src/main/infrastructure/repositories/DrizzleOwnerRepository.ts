import { owners } from "../database/schema/contacts";
import { DrizzleContactRepository } from "./DrizzleContactRepository";
import { IOwnerRepository } from "../../domain/repositories/IOwnerRepository";

export class DrizzleOwnerRepository extends DrizzleContactRepository implements IOwnerRepository {
  constructor() { super(owners); }
}
