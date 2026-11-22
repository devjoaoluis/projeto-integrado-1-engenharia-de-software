# [HU-16] Implementação Backend: Relatório de Repasse ao Proprietário (RF18)[cite: 3]

## Contexto e Objetivo
Implementar a lógica de backend para geração e consolidação do relatório mensal de repasse ao proprietário, permitindo que a imobiliária realize a prestação de contas[cite: 3].

* **História de Usuário:** Como imobiliária, eu quero gerar um relatório mensal mostrando o quanto o locatário pagou e a taxa que foi descontada, para prestar contas ao proprietário[cite: 3].
* **Rastreabilidade e Prioridade:** `RF18` | Prioridade: `Baixa prioridade`[cite: 3].

---

## Escopo (Backend vs. Frontend)
* **Frontend:** A criação do botão `"Gerar Repasse"` na tela do Proprietário pertence à interface[cite: 3].
* **Backend:** Implementar o endpoint e o serviço responsáveis por consolidar os pagamentos mensais do locatário, descontar a taxa de administração e disponibilizar os dados para a tela de impressão e/ou gerar o documento PDF do repasse[cite: 3].

---

## Requisitos Funcionais e Regras de Negócio (Backend)

### 1. Consolidação Mensal de Pagamentos por Proprietário
* Criar endpoint para consultar os pagamentos realizados pelos locatários vinculados aos imóveis de um determinado proprietário em um período mensal de referência (mês/ano)[cite: 3].
* Considerar no cálculo apenas os pagamentos efetivamente quitados/recebidos dentro da competência solicitada[cite: 3].

### 2. Cálculo do Valor Líquido de Repasse
* Calcular o valor final a ser repassado aplicando a fórmula: `Valor do Repasse = Valor Recebido - Taxa de Administração`[cite: 3].
* Identificar na modelagem existente do banco onde a taxa de administração está configurada (no contrato, no cadastro do imóvel ou como regra padrão da imobiliária) para aplicá-la corretamente.

### 3. Geração do Relatório (PDF e/ou Dados para Impressão) (`RF18`)
* Implementar a geração do arquivo PDF no backend (caso o projeto já utilize biblioteca de geração de PDF) e/ou retornar o payload JSON estruturado para alimentar a tela de impressão no frontend[cite: 3].
* O retorno/documento deve detalhar claramente: identificação do proprietário, imóveis vinculados, competência mensal, valor pago pelo locatário, valor da taxa de administração descontada e valor líquido final do repasse[cite: 3].

---

## Diretrizes Técnicas
1. **Inspeção Inicial:** Analise os models, relacionamentos e serviços existentes de `Proprietário`, `Imóvel`, `Contrato`, `Locatário` e `Pagamentos`, além de verificar se já existe padrão ou biblioteca de geração de PDF/relatórios no repositório.
2. **Precisão Numérica:** Utilize tipos decimais exatos (`Decimal`/`Numeric` ou cálculo em centavos inteiros) para calcular o desconto da taxa de administração sobre o valor recebido, evitando imprecisões de ponto flutuante (`float`).
3. **Validações e Casos de Borda:** Valide o ID do proprietário e o período mensal informado (mês/ano), retornando erros semânticos caso o proprietário não exista e tratando adequadamente meses sem pagamentos recebidos (ex.: repasse zerado ou mensagem informativa).
4. **Persistência (se aplicável):** Verifique no schema do banco se existe uma tabela de histórico de `Repasses` para registrar os relatórios emitidos ou se o fluxo opera estritamente como consulta/geração sob demanda.

---

## Critérios de Aceite
* [ ] Endpoint implementado para buscar e consolidar os pagamentos recebidos por proprietário em um determinado mês[cite: 3].
* [ ] Cálculo do repasse realizado corretamente subtraindo a taxa de administração do valor pago pelo locatário[cite: 3].
* [ ] Geração do documento PDF e/ou fornecimento dos dados estruturados para a tela de impressão funcionando conforme o padrão da arquitetura[cite: 3].
* [ ] Regras de cálculo e filtros cobertos por testes (unitários ou de integração).