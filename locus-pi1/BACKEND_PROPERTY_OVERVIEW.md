# HU-05 — Visão geral do imóvel (RF14)

Implementação somente de backend, seguindo entidades, interfaces de repositório, casos de uso, Drizzle/libSQL e Electron IPC. A tela continua sendo responsabilidade do frontend.

## API para o painel

`window.api.properties.overview(propertyId)` retorna:

- `property`: cadastro completo do imóvel;
- `media`: imagens e vídeos cadastrados;
- `contracts.current`: contratos ACTIVE já iniciados e sem término ou com término futuro;
- `contracts.previous`: contratos encerrados, cancelados ou com término atingido;
- `contracts.scheduled`: contratos ACTIVE com início futuro;
- `payments`, `inspections`, `maintenances`: históricos do imóvel, ordenados do mais recente para o mais antigo.

Imóvel inexistente ou identificador inválido gera erro. Categorias sem registros retornam listas vazias. Nenhum dado é simulado. Uma locação da HU-06 não é apresentada automaticamente como contrato: o registro do contrato deve ser informado, com `rentalId` opcional para vincular os dois.

## Registro dos históricos

Como esses módulos não existiam, foi incluída a API `window.api.propertyHistory.record({ type, data })` para registrar os dados consultados no painel. Não implementa emissão de cobranças, baixa de parcelas, assinatura digital, agendamento, edição ou exclusão dos históricos.

Todos os tipos exigem `propertyId`. IDs e `createdAt` são gerados no backend. Datas são timestamps em milissegundos, como `Date.now()`. Valores monetários são números em reais, conforme o padrão atual de `price` e `monthlyRent` do projeto.

| Tipo | Campos adicionais em `data` |
| --- | --- |
| CONTRACT | `tenantId`, `rentalId` (ID ou null), `reference`, `monthlyRent`, `startDate`, `endDate` (timestamp ou null), `status` (ACTIVE, ENDED ou CANCELLED) |
| PAYMENT | `contractId`, `amount`, `paidAt`, `description` |
| INSPECTION | `inspectedAt`, `description`, `reportReference` (referência ou null) |
| MAINTENANCE | `performedAt`, `description`, `cost` (valor ou null), `status` (PENDING, IN_PROGRESS ou COMPLETED) |

`reference` e `reportReference` identificam documentos; não enviam ou verificam arquivos. Campos anuláveis devem ser enviados explicitamente como null quando não houver valor.

Contratos exigem cliente cadastrado. Se houver `rentalId`, a locação deve pertencer ao mesmo imóvel e cliente. Pagamentos exigem contrato do mesmo imóvel; essa relação também é protegida por chave estrangeira composta no banco. Valores de aluguel e pagamento devem ser positivos; custo pode ser zero ou desconhecido (null). Pagamentos e vistorias não podem ter data futura; manutenção concluída também não. Contratos ENDED exigem término passado. O cadastro histórico não altera o status do imóvel nem confirma as condições da RN01.

A classificação dos contratos é calculada a cada consulta usando a data atual. O término é exclusivo: quando `endDate` é atingida, o contrato passa a aparecer em `previous`. Múltiplos contratos podem aparecer no painel, inclusive sublocações.

Imóveis com histórico não podem ser excluídos pela API; o bloqueio ocorre antes de remover mídias. Chaves estrangeiras também preservam imóveis, clientes e contratos referenciados.

## Banco e testes

Migração: `0004_add_property_history.sql`, acompanhada de snapshot e journal gerados pelo Drizzle. Na inicialização, as tabelas são criadas de forma idempotente, preservando os registros existentes.

Execute a partir de `locus-pi1`:

```bash
npx tsc --noEmit
npx tsc --module commonjs --moduleResolution node --outDir /tmp/locus-tests --sourceMap false
NODE_PATH="$PWD/node_modules" node /tmp/locus-tests/src/main/infrastructure/repositories/__tests__/PropertyOverview.test.js
```

Os testes usam SQLite em memória e não alteram o banco da aplicação. Validam cadastro, separação dos contratos, isolamento por imóvel, ordenação, restrições de pagamento, dados inválidos, preservação das mídias e atualização de um banco existente.

## Integração da branch

Esta branch parte da HU-06 para reaproveitar sua associação de locação e a integração com develop. Integre a HU-06 em develop antes do PR da HU-05, ou use a branch da HU-06 como base temporária do PR para revisar somente as mudanças desta tarefa.
