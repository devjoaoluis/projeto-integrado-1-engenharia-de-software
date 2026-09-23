import { ipcMain } from "electron";
import { LoginUser, LoginUserDTO } from "../application/use-cases/auth/login-user.use-case";
import { GetCurrentUser } from "../application/use-cases/auth/get-current-user.use-case";
import { LogoutUser } from "../application/use-cases/auth/logout-user.use-case";

import { DrizzleUserRepository } from "../infrastructure/repositories/drizzle-user.repository";
import { DrizzleSessionRepository } from "../infrastructure/repositories/drizzle-session.repository";
import { Argon2PasswordHasher } from "../infrastructure/security/argon2-password-hasher";

// Local in-memory store for session ID since the main process maintains state
let currentSessionId: string | null = null;

export function registerAuthIpc() {
  const userRepository = new DrizzleUserRepository();
  const sessionRepository = new DrizzleSessionRepository();
  const passwordHasher = new Argon2PasswordHasher();

  const loginUser = new LoginUser(userRepository, passwordHasher, sessionRepository);
  const getCurrentUser = new GetCurrentUser(sessionRepository, userRepository);
  const logoutUser = new LogoutUser(sessionRepository);

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
      // Session expired or invalid
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
}
