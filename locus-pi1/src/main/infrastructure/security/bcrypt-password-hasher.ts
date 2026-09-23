import * as bcrypt from "bcryptjs";
import { IPasswordHasher } from "../../domain/repositories/password-hasher";

export class BcryptPasswordHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async compare(password: string, passwordHash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, passwordHash);
    } catch {
      return false;
    }
  }
}
