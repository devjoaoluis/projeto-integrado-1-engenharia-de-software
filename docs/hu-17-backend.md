# [HU-17] Expansão de Modelos de Contrato (Comercial, Residencial, Temporada, etc.)

## Descrição
Expansão do catálogo de textos-base (modelos de contrato) no backend do sistema para atender a diferentes modalidades imobiliárias (Residencial Padrão, Residencial com Fiador, Comercial / Não Residencial e Locação por Temporada), assegurando que todas as variáveis automáticas sejam preenchidas de forma fidedigna e sem lacunas pendentes.

---

## 1. Cadastro dos Novos Textos-Base (Modelos)

Os novos modelos foram cadastrados no sistema de arquivos do backend (`src/main/application/use-cases/defaultContractTemplate.ts`), estruturados com cláusulas em estrita conformidade com a legislação brasileira (Lei do Inquilinato nº 8.245/1991 e Código Civil Brasileiro):

1. **Contrato de Locação Residencial (Padrão)** (`builtin-residencial-padrao`):
   - Locação residencial urbana sem garantia fidejussória (ou com caução padrão).
   - Identificação de locador, locatário, dados completos do imóvel, aluguel, IPTU, prazo e foro.

2. **Contrato de Locação Residencial com Fiador** (`builtin-residencial-fiador`):
   - Locação residencial com garantia fidejussória integral.
   - Cláusula de responsabilidade solidária do fiador e principal pagador, com renúncia expressa ao benefício de ordem (art. 827 do Código Civil).
   - Inclusão dos dados completos e assinaturas do fiador (`{{fiador.nome}}`, `{{fiador.cpf}}`, `{{fiador.telefone}}`, `{{fiador.email}}`).

3. **Contrato de Locação Não Residencial / Comercial** (`builtin-comercial`):
   - Locação voltada a fins comerciais, escritórios, consultórios e atividades industriais/empresariais (arts. 51 a 57 da Lei nº 8.245/91).
   - Cláusulas específicas sobre destinação comercial exclusiva, responsabilidade por alvarás, licenças de funcionamento e vistorias sanitárias/bombeiros pelo locatário.
   - Reajuste anual pelo índice oficial (IPCA/IGP-M) e regras de benfeitorias.

4. **Contrato de Locação por Temporada** (`builtin-temporada`):
   - Locação para temporada, lazer ou cursos por prazo determinado não superior a 90 dias (arts. 48 a 50 da Lei nº 8.245/91).
   - Cláusulas de inventário e vistoria dos bens móveis e utensílios fornecidos.
   - Cobrança antecipada e pagamento único ou parcelado facultado por lei (art. 49).

---

## 2. Preenchimento Automático de Variáveis

O caso de uso `FillContractTemplate` (`src/main/application/use-cases/FillContractTemplate.ts`) e o montador `AssembleContractData` (`src/main/application/use-cases/AssembleContractData.ts`) garantem a substituição automática e sem lacunas para todos os novos modelos:

### Variáveis e Marcadores Cobertos:
- **Imóvel:** `{{imovel.endereco}}`, `{{imovel.bairro}}`, `{{imovel.tipo}}`, `{{imovel.quartos}}`, `{{imovel.descricao}}`, `{{imovel.valor}}`, `{{imovel.preco}}`, `{{imovel.iptu}}`
- **Proprietário / Locador:** `{{proprietario.nome}}`, `{{proprietario.cpf}}`, `{{proprietario.telefone}}`, `{{proprietario.email}}`, `{{locador.*}}`
- **Locatário:** `{{locatario.nome}}`, `{{locatario.cpf}}`, `{{locatario.telefone}}`, `{{locatario.email}}`
- **Fiador:** `{{fiador.nome}}`, `{{fiador.cpf}}`, `{{fiador.telefone}}`, `{{fiador.email}}`
- **Aluguel e Prazos:** `{{aluguel.valor}}`, `{{aluguel.vencimento}}`, `{{aluguel.dia_vencimento}}`, `{{aluguel.inicio}}`, `{{aluguel.fim}}`, `{{aluguel.prazo_meses}}`, `{{aluguel.prazo_dias}}`
- **Contrato:** `{{contrato.valor}}`, `{{contrato.vencimento}}`, `{{contrato.inicio}}`, `{{contrato.fim}}`, `{{contrato.prazo_meses}}`, `{{contrato.prazo_dias}}`
- **Datas:** `{{data_atual}}`, `{{dia}}`, `{{mes}}`, `{{ano}}`

Suporta também variações em `snake_case` (ex: `{{fiador_nome}}`, `{{imovel_endereco}}`) e espaços internos nos marcadores.

---

## 3. Resolução Integrada e Seeding no Banco de Dados

- **Resolução Automática:** `AssembleContractData` aceita `templateId` referenciando modelos salvos no banco de dados (`contract_templates`) ou diretamente modelos nativos (`builtin-residencial-padrao`, `builtin-residencial-fiador`, `builtin-comercial`, `builtin-temporada`).
- **Cadastro no Banco:** Caso de uso `SeedBuiltinContractTemplates` (`src/main/application/use-cases/SeedBuiltinContractTemplates.ts`), que cadastra de forma idempotente os 4 modelos na tabela `contract_templates` caso ainda não estejam registrados.

---

## 4. Comunicação IPC e Preload

Novos canais expostos em `src/main/ipc/contracts.ipc.ts` e no preload `src/preload/preload.ts`:
- `window.api.contracts.getBuiltinTemplates()` -> `contracts:get-builtin-templates`: Retorna os modelos nativos disponíveis com id, nome, categoria, descrição e conteúdo base.
- `window.api.contracts.seedBuiltinTemplates()` -> `contracts:seed-builtin-templates`: Persiste os modelos nativos na tabela de modelos do banco de dados SQLite.

---

## 5. Testes Automatizados

Suíte de testes dedicada implementada em `src/main/application/use-cases/__tests__/ContractModelsExpansion.test.ts`:
- Disponibilidade de todos os modelos no catálogo.
- Preenchimento de variáveis sem lacunas pendentes para Residencial com Fiador, Comercial e Temporada.
- Integração de `AssembleContractData` com `templateId` built-in e resolução automática de fiador do locatário.
- Idempotência do cadastramento via `SeedBuiltinContractTemplates`.
- 100% de testes aprovados em todo o projeto (`npm test` e `npm run typecheck`).
