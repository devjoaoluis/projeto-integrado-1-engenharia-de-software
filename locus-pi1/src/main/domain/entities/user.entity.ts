export interface User {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  perguntaSeguranca: string | null;
  respostaHash: string | null;
  criadoEm: number;
  atualizadoEm: number;
}