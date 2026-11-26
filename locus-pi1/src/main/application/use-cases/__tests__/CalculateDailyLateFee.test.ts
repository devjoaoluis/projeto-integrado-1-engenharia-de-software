import { describe, it } from "node:test";
import assert from "node:assert";
import { CalculateDailyLateFee } from "../CalculateDailyLateFee";

describe("CalculateDailyLateFee Use Case (RN06)", () => {
  const calculator = new CalculateDailyLateFee();

  it("should calculate correct fee and interest for 10 days of delay", () => {
    // Valor original: R$ 1.000,00
    // Multa (2%): R$ 20,00
    // Juros (1% ao mês -> 1/30 = 0.033333% ao dia)
    // Para 10 dias: 1000 * (0.01 / 30) * 10 = 10 / 3 = ~3.33
    // Total mora: 20 + 3.33 = 23.33
    // Total devido: 1023.33
    const result = calculator.execute({
      originalAmount: 1000,
      dueDate: "2026-05-10",
      calculationDate: "2026-05-20",
    });

    assert.strictEqual(result.originalAmount, 1000);
    assert.strictEqual(result.daysOverdue, 10);
    assert.strictEqual(result.finePercentage, 2);
    assert.strictEqual(result.fineAmount, 20.00);
    assert.strictEqual(result.monthlyInterestRatePercentage, 1);
    assert.strictEqual(result.interestAmount, 3.33);
    assert.strictEqual(result.totalLateFee, 23.33);
    assert.strictEqual(result.totalAmountDue, 1023.33);
  });

  it("should return zero fine and interest when payment is on time or before due date", () => {
    const resultOnTime = calculator.execute({
      originalAmount: 500,
      dueDate: "2026-05-10",
      calculationDate: "2026-05-10",
    });

    assert.strictEqual(resultOnTime.daysOverdue, 0);
    assert.strictEqual(resultOnTime.fineAmount, 0);
    assert.strictEqual(resultOnTime.interestAmount, 0);
    assert.strictEqual(resultOnTime.totalLateFee, 0);
    assert.strictEqual(resultOnTime.totalAmountDue, 500);

    const resultBeforeDue = calculator.execute({
      originalAmount: 500,
      dueDate: "2026-05-15",
      calculationDate: "2026-05-10",
    });

    assert.strictEqual(resultBeforeDue.daysOverdue, 0);
    assert.strictEqual(resultBeforeDue.fineAmount, 0);
    assert.strictEqual(resultBeforeDue.interestAmount, 0);
    assert.strictEqual(resultBeforeDue.totalLateFee, 0);
    assert.strictEqual(resultBeforeDue.totalAmountDue, 500);
  });

  it("should calculate correctly for 30 days of delay (full month interest = 1%)", () => {
    // Valor original: R$ 2.000,00
    // Multa (2%): R$ 40,00
    // Juros (1% ao mês por 30 dias = 1%): R$ 20,00
    // Total mora: 40 + 20 = 60
    // Total devido: 2060.00
    const result = calculator.execute({
      originalAmount: 2000,
      dueDate: "2026-05-01",
      calculationDate: "2026-05-31",
    });

    assert.strictEqual(result.daysOverdue, 30);
    assert.strictEqual(result.fineAmount, 40.00);
    assert.strictEqual(result.interestAmount, 20.00);
    assert.strictEqual(result.totalLateFee, 60.00);
    assert.strictEqual(result.totalAmountDue, 2060.00);
  });

  it("should calculate correctly for 1 day of delay", () => {
    // Valor: 3000
    // Multa: 2% = 60
    // Juros: 3000 * (0.01 / 30) * 1 = 1.00
    // Total mora: 61.00
    const result = calculator.execute({
      originalAmount: 3000,
      dueDate: "2026-06-01",
      calculationDate: "2026-06-02",
    });

    assert.strictEqual(result.daysOverdue, 1);
    assert.strictEqual(result.fineAmount, 60.00);
    assert.strictEqual(result.interestAmount, 1.00);
    assert.strictEqual(result.totalLateFee, 61.00);
    assert.strictEqual(result.totalAmountDue, 3061.00);
  });

  it("should accept Date objects as input", () => {
    const due = new Date(2026, 4, 1);
    const calc = new Date(2026, 4, 11); // 10 dias
    const result = calculator.execute({
      originalAmount: 1000,
      dueDate: due,
      calculationDate: calc,
    });

    assert.strictEqual(result.daysOverdue, 10);
    assert.strictEqual(result.fineAmount, 20.00);
    assert.strictEqual(result.interestAmount, 3.33);
  });

  it("should throw error if original amount is invalid or non-positive", () => {
    assert.throws(() => {
      calculator.execute({ originalAmount: 0, dueDate: "2026-05-10" });
    }, /Original amount must be greater than zero/);

    assert.throws(() => {
      calculator.execute({ originalAmount: -100, dueDate: "2026-05-10" });
    }, /Original amount must be greater than zero/);

    assert.throws(() => {
      calculator.execute({ originalAmount: NaN, dueDate: "2026-05-10" });
    }, /Original amount is required and must be a valid number/);
  });

  it("should throw error if due date is invalid", () => {
    assert.throws(() => {
      calculator.execute({ originalAmount: 100, dueDate: "" });
    }, /Due date is required/);

    assert.throws(() => {
      calculator.execute({ originalAmount: 100, dueDate: "invalid-date" });
    }, /Due date is invalid/);
  });
});
