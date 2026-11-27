# Pagamentos

O módulo utiliza `property_payments` para registrar baixas manuais por competência. Os novos campos `reference_month`, `due_date` e `receipt_path` identificam a parcela liquidada, seu vencimento e o comprovante local. O índice único impede duas baixas do mesmo contrato na mesma competência.

Na inicialização, `initializeDatabase` adiciona as colunas ausentes e cria o índice, de forma idempotente. Para aplicar manualmente em uma base existente, faça backup do SQLite e execute uma única vez:

```sql
-- src/main/infrastructure/database/migrations/0015_payment_installments_and_receipts.sql
ALTER TABLE property_payments ADD COLUMN reference_month TEXT;
ALTER TABLE property_payments ADD COLUMN due_date INTEGER;
ALTER TABLE property_payments ADD COLUMN receipt_path TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS property_payments_contract_reference_unique
ON property_payments (contract_id, reference_month);
```

Baixas são sempre acionadas manualmente pela usuária. Os comprovantes aceitos (PDF, PNG e JPG) são copiados para `payment-receipts` dentro do diretório de dados do aplicativo; o banco guarda o caminho e o identificador da parcela. A mora exibida é multa única de 2% mais juros simples de 1% ao mês, calculados pro rata die sobre o aluguel.
