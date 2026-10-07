export interface User {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  perguntaSeguranca: string;
  respostaHash: string;
  criadoEm: number;
  atualizadoEm: number;
}