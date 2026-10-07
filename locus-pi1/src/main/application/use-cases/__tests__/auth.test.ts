import { RegisterUser, RegisterUserDTO } from "../auth/register-user.use-case";
import { IUserRepository } from "../../../domain/repositories/user.repository";
import { IPasswordHasher } from "../../../domain/repositories/password-hasher";

describe("RegisterUser Use Case", () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let registerUser: RegisterUser;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      updatePassword: jest.fn(),
      count: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    registerUser = new RegisterUser(userRepository, passwordHasher);
  });

  it("deve cadastrar um novo usuário gerando hash da senha e da resposta de segurança", async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockImplementation(async (val) => `hashed_${val}`);
    userRepository.create.mockImplementation(async (user) => user);

    const dto: RegisterUserDTO = {
      nome: "Henrique Costa",
      email: "henrique@example.com",
      senha: "senha123",
      perguntaSeguranca: "Qual o nome do seu primeiro pet?",
      respostaSeguranca: " Rex ",
    };

    const result = await registerUser.execute(dto);

    expect(userRepository.findByEmail).toHaveBeenCalledWith(dto.email);
    expect(passwordHasher.hash).toHaveBeenCalledWith("senha123");
    
    // Garante que a resposta foi processada com .trim().toLowerCase() ("rex")
    expect(passwordHasher.hash).toHaveBeenCalledWith("rex");

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: dto.nome,
        email: dto.email,
        senhaHash: "hashed_senha123",
        perguntaSeguranca: dto.perguntaSeguranca,
        respostaHash: "hashed_rex",
      })
    );

    expect(result.email).toBe(dto.email);
  });

  it("deve lançar erro ao tentar cadastrar e-mail já existente", async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: "uuid-existente",
      nome: "Usuário Existente",
      email: "henrique@example.com",
      senhaHash: "hash",
      perguntaSeguranca: "Pergunta?",
      respostaHash: "hash_resposta",
      criadoEm: Date.now(),
      atualizadoEm: Date.now(),
    });

    const dto: RegisterUserDTO = {
      nome: "Henrique Costa",
      email: "henrique@example.com",
      senha: "senha123",
      perguntaSeguranca: "Pergunta?",
      respostaSeguranca: "Resposta",
    };

    await expect(registerUser.execute(dto)).rejects.toThrow(
      "Usuário já cadastrado com este e-mail."
    );
  });
});