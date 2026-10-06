import { IUserRepository } from "../../../domain/repositories/user.repository";
import { ISessionRepository } from "../../../domain/repositories/session.repository";
import { User } from "../../../domain/entities/user.entity";

export class GetCurrentUser {
  constructor(
    private sessionRepository: ISessionRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(sessionId: string): Promise<User | null> {
    if (!sessionId) {
      return null;
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }

    const now = Date.now();
    if (session.expiresAt < now) {
      // Session is expired
      // Optionally delete the expired session here to clean up the DB
      await this.sessionRepository.deleteById(sessionId);
      return null;
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      return null;
    }

    return user;
  }
}
