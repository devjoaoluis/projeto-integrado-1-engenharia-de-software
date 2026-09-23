export interface User {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  criadoEm: number;
  atualizadoEm: number;
}
