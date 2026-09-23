import { randomUUID } from "crypto";
import { IUserRepository } from "../../../domain/repositories/user.repository";
import { IPasswordHasher } from "../../../domain/repositories/password-hasher";
import { User } from "../../../domain/entities/user.entity";

export interface RegisterUserDTO {
  nome: string;
  email: string;
  senha: string;
}

export class RegisterUser {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: RegisterUserDTO): Promise<Omit<User, 'senhaHash'>> {
    if (!dto.nome || !dto.email || !dto.senha) {
      throw new Error("Nome, email e senha são obrigatórios.");
    }

    if (dto.senha.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }

    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new Error("Este email já está em uso.");
    }

    const senhaHash = await this.passwordHasher.hash(dto.senha);
    const now = Date.now();

    const newUser: User = {
      id: randomUUID(),
      nome: dto.nome,
      email: dto.email,
      senhaHash,
      criadoEm: now,
      atualizadoEm: now,
    };

    const createdUser = await this.userRepository.create(newUser);

    // Retornamos o usuário omitindo a senha, por segurança
    const { senhaHash: _, ...userSemSenha } = createdUser;
    return userSemSenha;
  }
}
