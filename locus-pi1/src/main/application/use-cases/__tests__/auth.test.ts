import { describe, it } from "node:test";
import assert from "node:assert";
import { LoginUser } from "../login-user.use-case";
import { GetCurrentUser } from "../get-current-user.use-case";
import { LogoutUser } from "../logout-user.use-case";
import { User } from "../../../../domain/entities/user.entity";
import { Session } from "../../../../domain/entities/session.entity";
import { IUserRepository } from "../../../../domain/repositories/user.repository";
import { ISessionRepository } from "../../../../domain/repositories/session.repository";
import { IPasswordHasher } from "../../../../domain/repositories/password-hasher";
import { InvalidCredentialsError } from "../../../../domain/errors/auth.errors";

// Fakes
class FakeUserRepository implements IUserRepository {
  public users: User[] = [];
  async findById(id: string): Promise<User | null> { return this.users.find(u => u.id === id) || null; }
  async findByEmail(email: string): Promise<User | null> { return this.users.find(u => u.email === email) || null; }
  async create(user: User): Promise<User> { this.users.push(user); return user; }
}

class FakeSessionRepository implements ISessionRepository {
  public sessions: Session[] = [];
  async create(session: Session): Promise<Session> { this.sessions.push(session); return session; }
  async findById(id: string): Promise<Session | null> { return this.sessions.find(s => s.id === id) || null; }
  async deleteById(id: string): Promise<void> { this.sessions = this.sessions.filter(s => s.id !== id); }
  async deleteByUserId(userId: string): Promise<void> { this.sessions = this.sessions.filter(s => s.userId !== userId); }
}

class FakePasswordHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> { return password + "_hashed"; }
  async compare(password: string, passwordHash: string): Promise<boolean> { return password + "_hashed" === passwordHash; }
}

describe("Auth Use Cases", () => {
  it("LoginUser - valid credentials", async () => {
    const userRepo = new FakeUserRepository();
    const sessionRepo = new FakeSessionRepository();
    const hasher = new FakePasswordHasher();
    const loginUser = new LoginUser(userRepo, hasher, sessionRepo);

    await userRepo.create({ id: "u1", nome: "Test", email: "test@test.com", senhaHash: "123_hashed", criadoEm: 1, atualizadoEm: 1 });

    const session = await loginUser.execute({ email: "test@test.com", senha: "123" });
    assert.ok(session.id);
    assert.strictEqual(session.userId, "u1");
    assert.ok(session.expiresAt > Date.now());
  });

  it("LoginUser - invalid credentials", async () => {
    const userRepo = new FakeUserRepository();
    const sessionRepo = new FakeSessionRepository();
    const hasher = new FakePasswordHasher();
    const loginUser = new LoginUser(userRepo, hasher, sessionRepo);

    await userRepo.create({ id: "u1", nome: "Test", email: "test@test.com", senhaHash: "123_hashed", criadoEm: 1, atualizadoEm: 1 });

    await assert.rejects(
      async () => await loginUser.execute({ email: "test@test.com", senha: "wrong" }),
      (err: Error) => err instanceof InvalidCredentialsError
    );
  });

  it("GetCurrentUser - valid session", async () => {
    const sessionRepo = new FakeSessionRepository();
    const userRepo = new FakeUserRepository();
    const getCurrentUser = new GetCurrentUser(sessionRepo, userRepo);

    await userRepo.create({ id: "u1", nome: "Test", email: "test@test.com", senhaHash: "hash", criadoEm: 1, atualizadoEm: 1 });
    await sessionRepo.create({ id: "s1", userId: "u1", createdAt: Date.now(), expiresAt: Date.now() + 10000 });

    const user = await getCurrentUser.execute("s1");
    assert.ok(user);
    assert.strictEqual(user.id, "u1");
  });

  it("GetCurrentUser - expired session", async () => {
    const sessionRepo = new FakeSessionRepository();
    const userRepo = new FakeUserRepository();
    const getCurrentUser = new GetCurrentUser(sessionRepo, userRepo);

    await userRepo.create({ id: "u1", nome: "Test", email: "test@test.com", senhaHash: "hash", criadoEm: 1, atualizadoEm: 1 });
    await sessionRepo.create({ id: "s1", userId: "u1", createdAt: Date.now() - 20000, expiresAt: Date.now() - 10000 }); // Expired

    const user = await getCurrentUser.execute("s1");
    assert.strictEqual(user, null);
    
    // Validate that expired session is removed
    const sessionInDb = await sessionRepo.findById("s1");
    assert.strictEqual(sessionInDb, null);
  });

  it("LogoutUser - removes session", async () => {
    const sessionRepo = new FakeSessionRepository();
    const logoutUser = new LogoutUser(sessionRepo);

    await sessionRepo.create({ id: "s1", userId: "u1", createdAt: Date.now(), expiresAt: Date.now() + 10000 });
    
    await logoutUser.execute("s1");
    
    const session = await sessionRepo.findById("s1");
    assert.strictEqual(session, null);
  });
});
