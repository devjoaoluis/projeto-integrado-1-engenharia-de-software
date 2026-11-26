import { randomUUID } from "crypto";
import { IUserRepository } from "../../../domain/repositories/user.repository";
import { IPasswordHasher } from "../../../domain/repositories/password-hasher";
import { User } from "../../../domain/entities/user.entity";

export interface RegisterUserDTO {
  nome: string;
  email: string;
  senha: string;
  perguntaSeguranca: string;
  respostaSeguranca: string;
}

export class RegisterUser {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: RegisterUserDTO): Promise<Omit<User, "senhaHash" | "respostaHash">> {
    if (
      !dto.nome ||
      !dto.email ||
      !dto.senha ||
      !dto.perguntaSeguranca ||
      !dto.respostaSeguranca
    ) {
      throw new Error("Todos os campos são obrigatórios.");
    }

    if (dto.senha.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }

    // Normaliza o e-mail (remove espaços e converte para minúsculas)
    const emailNormalizado = dto.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(emailNormalizado);
    if (existingUser) {
      throw new Error("Este email já está em uso.");
    }

    const senhaHash = await this.passwordHasher.hash(dto.senha);

    const respostaNormalizada = dto.respostaSeguranca.trim().toLowerCase();
    const respostaHash = await this.passwordHasher.hash(respostaNormalizada);

    const now = Date.now();

    const newUser: User = {
      id: randomUUID(),
      nome: dto.nome.trim(),
      email: emailNormalizado, // Utiliza o e-mail normalizado
      senhaHash,
      perguntaSeguranca: dto.perguntaSeguranca,
      respostaHash,
      criadoEm: now,
      atualizadoEm: now,
    };

    const createdUser = await this.userRepository.create(newUser);

    const { senhaHash: _, respostaHash: __, ...userSemDadosSensiveis } = createdUser;
    return userSemDadosSensiveis;
  }
}