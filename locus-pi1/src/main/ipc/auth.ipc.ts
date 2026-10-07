import { ipcMain } from "electron";
import { RegisterUser, RegisterUserDTO } from "../application/use-cases/auth/register-user.use-case";
import { LoginUser, LoginUserDTO } from "../application/use-cases/auth/login-user.use-case";
import { GetCurrentUser } from "../application/use-cases/auth/get-current-user.use-case";
import { LogoutUser } from "../application/use-cases/auth/logout-user.use-case";

import { DrizzleUserRepository } from "../infrastructure/repositories/drizzle-user.repository";
import { DrizzleSessionRepository } from "../infrastructure/repositories/drizzle-session.repository";
import { BcryptPasswordHasher } from "../infrastructure/security/bcrypt-password-hasher";

let currentSessionId: string | null = null;

export function registerAuthIpc() {
  const userRepository = new DrizzleUserRepository();
  const sessionRepository = new DrizzleSessionRepository();
  const passwordHasher = new BcryptPasswordHasher();

  const registerUser = new RegisterUser(userRepository, passwordHasher);
  const loginUser = new LoginUser(userRepository, passwordHasher, sessionRepository);
  const getCurrentUser = new GetCurrentUser(sessionRepository, userRepository);
  const logoutUser = new LogoutUser(sessionRepository);

  ipcMain.handle("auth:register", async (_, data: RegisterUserDTO) => {
    try {
      const user = await registerUser.execute(data);
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("auth:login", async (_, data: LoginUserDTO) => {
    try {
      const session = await loginUser.execute(data);
      currentSessionId = session.id;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("auth:current-user", async () => {
    if (!currentSessionId) return { user: null };
    const user = await getCurrentUser.execute(currentSessionId);
    if (!user) {
      currentSessionId = null;
    }
    return { user };
  });

  ipcMain.handle("auth:logout", async () => {
    if (currentSessionId) {
      await logoutUser.execute(currentSessionId);
      currentSessionId = null;
    }
    return { success: true };
  });

  ipcMain.handle("auth:has-users", async () => {
    try {
      const userCount = await userRepository.count();
      const hasUsers = userCount > 0;
      return { success: true, hasUsers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Busca a pergunta de segurança aplicando a normalização do e-mail
  ipcMain.handle("auth:get-security-question", async (_, email: string) => {
    try {
      if (!email) {
        return { success: false, error: "Informe o e-mail." };
      }

      const emailNormalizado = email.trim().toLowerCase();
      const user = await userRepository.findByEmail(emailNormalizado);

      if (!user) {
        return { success: false, error: "E-mail não encontrado." };
      }

      return { success: true, pergunta: user.perguntaSeguranca };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Redefine a senha tratando 'resposta' ou 'respostaSeguranca' e normalizando os dados
  ipcMain.handle("auth:reset-password", async (_, data: any) => {
    try {
      const email = data.email;
      const resposta = data.respostaSeguranca || data.resposta;
      const novaSenha = data.novaSenha;

      if (!email || !resposta || !novaSenha) {
        return { success: false, error: "Todos os campos são obrigatórios." };
      }

      const emailNormalizado = email.trim().toLowerCase();
      const user = await userRepository.findByEmail(emailNormalizado);

      if (!user) {
        return { success: false, error: "Usuário não encontrado." };
      }

      if (!user.respostaHash) {
        return { success: false, error: "Usuário não possui pergunta de segurança configurada." };
      }

      const respostaNormalizada = resposta.trim().toLowerCase();
      const isRespostaValida = await passwordHasher.compare(
        respostaNormalizada,
        user.respostaHash
      );

      if (!isRespostaValida) {
        return { success: false, error: "Resposta de segurança incorreta." };
      }

      const novaSenhaHash = await passwordHasher.hash(novaSenha);
      await userRepository.updatePassword(user.id, novaSenhaHash);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}