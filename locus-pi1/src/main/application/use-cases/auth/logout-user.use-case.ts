import { ISessionRepository } from "../../../domain/repositories/session.repository";

export class LogoutUser {
  constructor(private sessionRepository: ISessionRepository) {}

  async execute(sessionId: string): Promise<void> {
    if (!sessionId) {
      return;
    }
    
    await this.sessionRepository.deleteById(sessionId);
  }
}
