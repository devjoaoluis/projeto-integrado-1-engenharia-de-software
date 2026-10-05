# Locação: integração do backend

Implementação segue entidades → interfaces de repositório → casos de uso → Drizzle/SQLite → Electron IPC. Nenhuma tela foi adicionada.

A API disponível no preload é `window.api.rentals`:

- `create({ propertyId, tenantId, monthlyRent, startDate, dueDay, contractSigned?, signaturesNotarized?, initialPaymentsPaid?, parentRentalId?, formalConsent? })`: associa um cliente cadastrado ao imóvel e atualiza o status para `ALUGADO` na mesma transação. `startDate` é um timestamp em milissegundos; `dueDay` vai de 1 a 31. Registra valor mensal, início e vencimento para controle do aluguel.
- `get(id)` e `list()`: consultam as locações.
- `updatePrerequisites({ id, contractSigned, signaturesNotarized, initialPaymentsPaid })`: registra as três confirmações da RN01 antes da entrega das chaves.
- `releaseKeys(id)`: exige todas as confirmações da RN01 e registra a data de entrega. Repetições preservam a data original.

A associação pode ocorrer com pendências documentais ou financeiras; elas impedem a entrega das chaves. As confirmações são registradas pelo corretor, sem validação externa de documentos ou pagamentos.

Para sublocação, informe `parentRentalId` da locação principal do mesmo imóvel e `formalConsent` com referência ao documento de consentimento formal (RN02). Uma segunda locação principal é bloqueada, mesmo se o status tiver sido alterado indevidamente. O consentimento informado é uma referência documental, não uma assinatura digital verificada.

Imóveis cadastrados ou disponíveis podem receber a locação principal. Imóveis vendidos ou inativos são bloqueados. Clientes e imóveis vinculados não podem ser excluídos; o vínculo financeiro é preservado. A edição do imóvel mantém `ALUGADO` enquanto houver locação. Encerramento de contratos, geração de cobranças e baixa de parcelas não fazem parte desta implementação.

A tabela é criada na inicialização, conforme o padrão atual de `db.ts`; o schema e a migração SQL também estão versionados.
