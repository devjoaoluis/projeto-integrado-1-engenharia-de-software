import { Contact } from "./Contact";

export type ClientType = "TENANT" | "INTERESTED";

export interface Client extends Contact {
  type: ClientType;
  guarantorId: string | null;
}
