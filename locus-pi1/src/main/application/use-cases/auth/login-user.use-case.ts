import { randomUUID } from "crypto";
import { IUserRepository } from "../../../domain/repositories/user.repository";
import { ISessionRepository } from "../../../domain/repositories/session.repository";
import { IPasswordHasher } from "../../../domain/repositories/password-hasher";
import { Session } from "../../../domain/entities/session.entity";
import { InvalidCredentialsError } from "../../../domain/errors/auth.errors";

export interface LoginUserDTO {
  email: string;
  senha: string;
}

export class LoginUser {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher,
    private sessionRepository: ISessionRepository
  ) {}

  async execute(dto: LoginUserDTO): Promise<Session> {
    if (!dto.email || !dto.senha) {
      throw new InvalidCredentialsError();
    }

    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const isPasswordValid = await this.passwordHasher.compare(dto.senha, user.senhaHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    const sessionId = randomUUID();
    const now = Date.now();
    // Expiration set to 24 hours from now
    const expiresAt = now + 24 * 60 * 60 * 1000;

    const session: Session = {
      id: sessionId,
      userId: user.id,
      createdAt: now,
      expiresAt: expiresAt,
    };

    return this.sessionRepository.create(session);
  }
}
