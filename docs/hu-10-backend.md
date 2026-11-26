# [HU-10] Notificação de Atraso e Controle de Inadimplência (RF08)

## Descrição
Como corretor, eu quero que o sistema notifique o locatário automaticamente caso o aluguel atrase, para facilitar a cobrança e garantir o controle financeiro rigoroso das locações.

---

## Regras de Negócio e Requisitos Técnicos

### 1. Rotina de Verificação de Datas de Vencimento
- **Caso de uso**: `CheckOverdueRents` (`src/main/application/use-cases/CheckOverdueRents.ts`).
- Varre todos os contratos de locação ativos (`rentals`), apura as competências devidas desde a data de início da locação (`startDate`) até o timestamp atual de consulta com base no dia fixado de vencimento (`dueDay`).
- Cruza cronologicamente os pagamentos já liquidados (`propertyPayments`) na ordem FIFO para identificar com exatidão as competências em aberto cujo vencimento já expirou (`dueDate < currentTimestamp`).

### 2. Cálculo Automático de Mora Diária (RN06)
- **Função de domínio**: `calculateOverdueCharges` (`src/main/domain/entities/OverdueRent.ts`).
- **Fórmula de cálculo**:
  - Dias em atraso: `daysOverdue = Math.floor((currentTimestamp - dueDate) / (24 * 60 * 60 * 1000))`
  - Juros de mora pro rata die (1% ao mês): `interestAmount = originalAmount * (0.01 / 30) * daysOverdue`
  - Multa por dia de atraso (2% ao dia): `fineAmount = originalAmount * 0.02 * daysOverdue`
  - Valor total atualizado: `totalAmount = originalAmount + interestAmount + fineAmount`
  - Valores arredondados rigorosamente a duas casas decimais (`Math.round(... * 100) / 100`).

### 3. Disparo de Alertas e Notificações aos Locatários
- **Caso de uso**: `TriggerOverdueAlerts` (`src/main/application/use-cases/TriggerOverdueAlerts.ts`).
- Gera mensagens descritivas personalizadas para cada locatário inadimplente com detalhamento do valor original, juros, multa calculada e total devido.
- Prevenção de duplicidade: não reenvia notificações no mesmo dia (intervalo mínimo de 24 horas) para a mesma competência da locação, a menos que o parâmetro `force: true` seja explicitamente informado.
- Persistência estruturada no repositório `overdue_notifications`.

### 4. Bloqueio de Baixa Automática para Débitos > 2 Meses (RN05)
- **Regra**: Débitos com mais de 2 meses de atraso (`daysOverdue > 60`) têm a baixa automática expressamente bloqueada pelo sistema (`isOverTwoMonths = true`, `autoSettlementBlocked = true`).
- **Caso de uso de liquidação**: `SettleOverdueDebt` (`src/main/application/use-cases/SettleOverdueDebt.ts`).
  - Se a tentativa de baixa for automática (`automatic === true`), lança exceção impeditiva:
    `"RN05: Baixa automática bloqueada para débitos com mais de 2 meses de atraso. O débito permanece pendente."`
  - A baixa manual pelo corretor (`automatic === false`) é permitida para possibilitar negociações especiais e quitações em cartório/acordo.

### 5. Integridade Financeira e Persistência (RNF01)
- Tabela `overdue_notifications` criada via Drizzle ORM e migração SQLite (`0012_overdue_notifications.sql`):
  - Chaves estrangeiras e índices em `rental_id`, `tenant_id`, `due_date`, e `(rental_id, reference_month)`.
  - Exclusão em cascata configurada (`ON DELETE CASCADE`) para integridade referencial com `rentals` e `clients`.
- Ao quitar o débito via `SettleOverdueDebt`, um registro fidedigno de pagamento é inserido na tabela `property_payments` com histórico e rastreabilidade da baixa.

---

## Canais IPC Expostos (`overdue:*`)

Registrados em `src/main/ipc/overdue.ipc.ts` e expostos no renderer via `window.api.overdue` em `preload.ts`:

1. `window.api.overdue.check(options)` -> `overdue:check`:
   - Retorna resumo financeiro (`totalOverdueContracts`, `totalDebtsCount`, `totalDueAmount`, `totalCriticalDebts`) e lista detalhada de inadimplentes.
2. `window.api.overdue.triggerAlerts(options)` -> `overdue:trigger-alerts`:
   - Executa a verificação, gera as mensagens e persiste as notificações no banco de dados.
3. `window.api.overdue.settleDebt(input)` -> `overdue:settle-debt`:
   - Executa a quitação de competência em atraso, validando o bloqueio da RN05 caso a baixa seja automática.
4. `window.api.overdue.listNotifications(filter)` -> `overdue:list-notifications`:
   - Consulta o histórico de notificações de cobrança disparadas.

---

## Testes Automatizados

Suíte de testes implementada e 100% validada:
- `src/main/application/use-cases/__tests__/OverdueRent.test.ts`:
  - Cálculo exato de juros pro rata die e multa diária (RN06).
  - Sinalização de inadimplência crítica (> 60 dias) para a RN05.
  - Verificação de parcelas e reconhecimento de pagamentos pontuais anteriores.
  - Disparo de alertas com bloqueio de duplicidade em 24h.
  - Bloqueio estrito de baixa automática para débitos > 60 dias (RN05).
  - Permissão de baixa manual por corretor.
  - Filtros de consulta de notificações.
- `src/main/infrastructure/repositories/__tests__/OverdueNotifications.test.ts`:
  - Persistência e listagem via Drizzle ORM no SQLite.
  - Integridade referencial e exclusão em cascata (RNF01).
  - Registro correto dos canais IPC `overdue:*`.
