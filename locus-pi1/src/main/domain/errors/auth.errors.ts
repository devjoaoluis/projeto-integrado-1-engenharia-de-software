export class InvalidCredentialsError extends Error {
  constructor() {
    super("Credenciais inválidas");
    this.name = "InvalidCredentialsError";
  }
}

export class SessionNotFoundError extends Error {
  constructor() {
    super("Sessão não encontrada");
    this.name = "SessionNotFoundError";
  }
}

export class SessionExpiredError extends Error {
  constructor() {
    super("Sessão expirada");
    this.name = "SessionExpiredError";
  }
}
