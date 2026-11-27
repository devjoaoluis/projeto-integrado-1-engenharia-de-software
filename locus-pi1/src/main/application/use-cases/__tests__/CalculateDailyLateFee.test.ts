import { describe, it } from "node:test";
import assert from "node:assert";
import { CalculateDailyLateFee } from "../CalculateDailyLateFee";

describe("CalculateDailyLateFee Use Case", () => {
  const calculator = new CalculateDailyLateFee();

  it("uses configured default fine, interest, and grace period for 10 overdue days", () => {
    // Valor original: R$ 1.000,00
    // Após 3 dias de carência: multa 10% e juros de 7 dias.
    const result = calculator.execute({
      originalAmount: 1000,
      dueDate: "2026-05-10",
      calculationDate: "2026-05-20",
    });

    assert.strictEqual(result.originalAmount, 1000);
    assert.strictEqual(result.daysOverdue, 10);
    assert.strictEqual(result.finePercentage, 10);
    assert.strictEqual(result.fineAmount, 100);
    assert.strictEqual(result.monthlyInterestRatePercentage, 1);
    assert.strictEqual(result.interestAmount, 2.33);
    assert.strictEqual(result.totalLateFee, 102.33);
    assert.strictEqual(result.totalAmountDue, 1102.33);
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

  it("applies the grace period before calculating prorated interest", () => {
    // Valor original: R$ 2.000,00
    // Com 27 dias sujeitos a juros: multa R$ 200,00 e juros R$ 18,00.
    const result = calculator.execute({
      originalAmount: 2000,
      dueDate: "2026-05-01",
      calculationDate: "2026-05-31",
    });

    assert.strictEqual(result.daysOverdue, 30);
    assert.strictEqual(result.fineAmount, 200);
    assert.strictEqual(result.interestAmount, 18);
    assert.strictEqual(result.totalLateFee, 218);
    assert.strictEqual(result.totalAmountDue, 2218);
  });

  it("should calculate correctly for 1 day of delay", () => {
    // Um dia de atraso ainda está dentro dos 3 dias de carência.
    const result = calculator.execute({
      originalAmount: 3000,
      dueDate: "2026-06-01",
      calculationDate: "2026-06-02",
    });

    assert.strictEqual(result.daysOverdue, 1);
    assert.strictEqual(result.fineAmount, 0);
    assert.strictEqual(result.interestAmount, 0);
    assert.strictEqual(result.totalLateFee, 0);
    assert.strictEqual(result.totalAmountDue, 3000);
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
    assert.strictEqual(result.fineAmount, 100);
    assert.strictEqual(result.interestAmount, 2.33);
  });

  it("accepts custom settings and reports their percentages", () => {
    const result = calculator.execute({
      originalAmount: 100,
      dueDate: "2026-05-10",
      calculationDate: "2026-05-11",
    }, {
      graceDays: 0,
      fineRateBasisPoints: 500,
      monthlyInterestBasisPoints: 200,
    });

    assert.equal(result.finePercentage, 5);
    assert.equal(result.monthlyInterestRatePercentage, 2);
    assert.equal(result.fineAmount, 5);
    assert.equal(result.interestAmount, 0.07);
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
