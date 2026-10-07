import { IUserRepository } from "../../../domain/repositories/user.repository";
import { ISessionRepository } from "../../../domain/repositories/session.repository";
import { IPasswordHasher } from "../../../domain/repositories/password-hasher";

export interface ResetPasswordDTO {
  email: string;
  novaSenha: string;
  respostaSeguranca?: string;
  resposta?: string;
}

export class ResetPassword {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher,
    private sessionRepository: ISessionRepository
  ) {}

  async execute(data: ResetPasswordDTO): Promise<void> {
    const resposta = data?.respostaSeguranca || data?.resposta;
    if (typeof data?.email !== "string" || !data.email.trim() ||
        typeof resposta !== "string" || !resposta.trim() ||
        typeof data?.novaSenha !== "string" || !data.novaSenha) {
      throw new Error("Todos os campos são obrigatórios.");
    }
    if (data.novaSenha.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }
    const user = await this.userRepository.findByEmail(data.email.trim().toLowerCase());
    if (!user) throw new Error("Usuário não encontrado.");
    if (!user.perguntaSeguranca || !user.respostaHash) {
      throw new Error("Usuário não possui pergunta de segurança configurada.");
    }
    if (!await this.passwordHasher.compare(resposta.trim().toLowerCase(), user.respostaHash)) {
      throw new Error("Resposta de segurança incorreta.");
    }
    const passwordHash = await this.passwordHasher.hash(data.novaSenha);
    // Invalidate sessions first so a failure cannot leave an old session with a new password.
    await this.sessionRepository.deleteByUserId(user.id);
    await this.userRepository.updatePassword(user.id, passwordHash);
  }
}
