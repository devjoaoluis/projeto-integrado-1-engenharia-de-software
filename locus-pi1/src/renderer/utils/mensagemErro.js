export function mensagemErro(error, mensagemPadrao) {
  const texto = error instanceof Error ? error.message : String(error || "");
  const normalizado = texto.toLowerCase();

  if (normalizado.includes("foreign key") || normalizado.includes("constraint")) {
    return "Não é possível excluir este cadastro porque ele ainda está sendo usado em outro registro. Remova primeiro essa associação e tente novamente.";
  }
  if (normalizado.includes("not found")) {
    return "Este registro não foi encontrado. Atualize a lista e tente novamente.";
  }
  if (normalizado.includes("rented") || normalizado.includes("alugado")) {
    return "Não é possível excluir este imóvel enquanto houver uma locação ativa. Desassocie o locatário primeiro.";
  }
  if (normalizado.includes("history") || normalizado.includes("histórico")) {
    return "Não é possível excluir este imóvel porque ele possui histórico de contratos, pagamentos, vistorias ou manutenções.";
  }
  return texto && !/error|exception|failed|constraint/i.test(texto) ? texto : mensagemPadrao;
}
