# [HU-14] Implementação Backend: Fluxo de Rescisão e Desassociação de Locatário[cite: 1]

## Contexto e Objetivo
Implementar a lógica de backend para o fluxo seguro de quebra de contrato e desassociação de locatário[cite: 1].

* **História de Usuário:** Como corretor, eu quero realizar a quebra de contrato e desassociação do locatário através de um fluxo seguro, verificando a aba de pagamentos antes de liberar o imóvel, para evitar que o locatário saia deixando dívidas ocultas[cite: 1].

---

## Escopo e Status Atual
* **Resumo Financeiro / Verificação de Débitos (`Back: feito`):** A checklist da tarefa indica que a parte de backend referente à consulta de resumo e verificação de débitos pendentes na aba de pagamentos já foi desenvolvida[cite: 1]. **Ação:** Localize esse endpoint/serviço existente no repositório para integrá-lo ao fluxo final ou validar se atende ao payload necessário.
* **Desassociação e Histórico de Ocupação (A implementar):** Implementar a efetivação da rescisão/desassociação e a gravação dos dados de saída no banco de dados para alimentar o **Histórico de Ocupação**[cite: 1].

---

## Requisitos Funcionais (Backend)

### 1. Validação Pré-Rescisão (Resumo de Pagamentos)
* Garantir que o endpoint de resumo retorne os dados da aba de pagamentos vinculados ao contrato/locatário, sinalizando claramente se existem débitos pendentes antes da confirmação da saída[cite: 1].

### 2. Quebra de Contrato e Desassociação do Locatário
* Criar/atualizar o endpoint responsável por executar o encerramento/quebra de contrato e desassociar o locatário do imóvel[cite: 1].
* Atualizar o status do contrato para encerrado/rescindido e liberar o imóvel (atualizando seu status de ocupação para disponível, conforme o domínio do sistema)[cite: 1].
* Permitir que o corretor conclua a operação mesmo havendo débitos alertados na etapa anterior (fluxo de alerta, não necessariamente bloqueio rígido, salvo regra existente no código), registrando o estado financeiro no momento da saída[cite: 1].

### 3. Persistência no Histórico de Ocupação
* Salvar o registro de saída do locatário no banco de dados para alimentar o **Histórico de Ocupação**[cite: 1].
* Garantir que o registro contenha os vínculos necessários (imóvel, locatário, contrato, data de saída/rescisão e informações relevantes do encerramento).

---

## Diretrizes Técnicas
1. **Inspeção Inicial:** Analise os models, migrations, controllers/services existentes relacionados a `Imóvel`, `Locatário`, `Contrato`, `Pagamentos` e `Histórico de Ocupação` antes de criar novas estruturas.
2. **Transação Atômica:** Execute a atualização do contrato, a desassociação/liberação do imóvel e a criação do registro no Histórico de Ocupação dentro de uma única transação de banco de dados (`transaction`) para evitar inconsistências.
3. **Integridade e Validações:** Valide se o contrato/vínculo está ativo antes de permitir o encerramento, retornando erros HTTP semânticos caso o imóvel já esteja desocupado ou o contrato já esteja encerrado.
4. **Migrations (se necessário):** Caso a tabela/entidade de Histórico de Ocupação ainda não possua os campos necessários para registrar a saída, crie a migration seguindo o padrão do projeto.

---

## Critérios de Aceite
* [ ] Endpoint de resumo financeiro validado e integrado para alertar sobre débitos pendentes da aba de pagamentos[cite: 1].
* [ ] Endpoint de encerramento/quebra de contrato desassocia o locatário e libera o status do imóvel[cite: 1].
* [ ] Saída do locatário devidamente persistida no banco de dados alimentando o Histórico de Ocupação[cite: 1].
* [ ] Operação executada de forma transacional e coberta por testes (unitários ou de integração) seguindo o padrão do repositório.