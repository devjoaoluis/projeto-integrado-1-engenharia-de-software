import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RegisterUser, RegisterUserDTO } from "../auth/register-user.use-case";
import { IUserRepository } from "../../../domain/repositories/user.repository";
import { IPasswordHasher } from "../../../domain/repositories/password-hasher";
import { User } from "../../../domain/entities/user.entity";

const dto: RegisterUserDTO = {
  nome: "Henrique Costa", email: "henrique@example.com", senha: "senha123",
  perguntaSeguranca: "Qual o nome do seu primeiro pet?", respostaSeguranca: " Rex ",
};
function setup(existing: User | null = null) {
  const hashed: string[] = [];
  const lookedUp: string[] = [];
  const created: User[] = [];
  const users: IUserRepository = {
    findById: async () => existing,
    findByEmail: async (email) => { lookedUp.push(email); return existing; },
    create: async (user) => { created.push(user); return user; },
    updatePassword: async () => undefined,
    count: async () => existing ? 1 : 0,
  };
  const hasher: IPasswordHasher = {
    hash: async (value) => { hashed.push(value); return `hashed_${value}`; },
    compare: async () => false,
  };
  return { register: new RegisterUser(users, hasher), hashed, lookedUp, created };
}
describe("RegisterUser Use Case", () => {
  it("deve cadastrar um novo usuário gerando hash da senha e da resposta de segurança", async () => {
    const { register, hashed, lookedUp, created } = setup();
    const result = await register.execute(dto);
    assert.deepEqual(lookedUp, [dto.email]);
    assert.deepEqual(hashed, ["senha123", "rex"]);
    assert.equal(created[0].nome, dto.nome);
    assert.equal(created[0].email, dto.email);
    assert.equal(created[0].senhaHash, "hashed_senha123");
    assert.equal(created[0].perguntaSeguranca, dto.perguntaSeguranca);
    assert.equal(created[0].respostaHash, "hashed_rex");
    assert.equal(result.email, dto.email);
    assert.equal(Object.hasOwn(result, "senhaHash"), false);
    assert.equal(Object.hasOwn(result, "respostaHash"), false);
  });
  it("deve lançar erro ao tentar cadastrar e-mail já existente", async () => {
    const { register, hashed, created } = setup({
      id: "existente", nome: dto.nome, email: dto.email, senhaHash: "hash",
      perguntaSeguranca: "Pergunta?", respostaHash: "hash_resposta", criadoEm: 1, atualizadoEm: 1,
    });
    await assert.rejects(register.execute(dto), /Este email já está em uso/);
    assert.equal(hashed.length, 0);
    assert.equal(created.length, 0);
  });
});
