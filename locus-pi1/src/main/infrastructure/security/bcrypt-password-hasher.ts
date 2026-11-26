import bcrypt from "bcryptjs";
import { IPasswordHasher } from "../../domain/repositories/password-hasher";

export class BcryptPasswordHasher implements IPasswordHasher {
  async hash(plainText: string): Promise<string> {
    return await bcrypt.hash(plainText, 10);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    // A ordem OBRIGATÓRIA é: (textoPuro, hash)
    return await bcrypt.compare(plainText, hash);
  }
}