import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcularEncargos,
  DEFAULT_FINANCIAL_LATE_RULES,
  FinancialLateRules,
} from "../../../domain/entities/FinancialCharges";

const noGrace = { ...DEFAULT_FINANCIAL_LATE_RULES, graceDays: 0 };
const installment = (dueDate: string, amountCents = 100_000) => ({ dueDate, amountCents });

describe("calcularEncargos", () => {
  it("uses the confirmed three-day grace period by default", () => {
    assert.equal(DEFAULT_FINANCIAL_LATE_RULES.graceDays, 3);
  });

  it("counts the day after the 10th as one day late and rounds only at the final cent", () => {
    assert.deepEqual(
      calcularEncargos(installment("2026-01-10"), noGrace, "2026-01-11"),
      { diasAtraso: 1, multa: 10_000, juros: 33, total: 110_033 },
    );
  });

  it("does not charge for a payment made on or before the due date", () => {
    assert.deepEqual(
      calcularEncargos(installment("2026-01-10"), noGrace, "2026-01-10"),
      { diasAtraso: 0, multa: 0, juros: 0, total: 100_000 },
    );
    assert.equal(
      calcularEncargos(installment("2026-01-10"), noGrace, "2026-01-09").total,
      100_000,
    );
  });

  it("calculates 5, 15, and 30 late days", () => {
    const expected = [
      ["2026-01-15", 5, 167],
      ["2026-01-25", 15, 500],
      ["2026-02-09", 30, 1_000],
    ] as const;
    for (const [date, days, interest] of expected) {
      const result = calcularEncargos(installment("2026-01-10"), noGrace, date);
      assert.equal(result.diasAtraso, days);
      assert.equal(result.juros, interest);
      assert.equal(result.multa, 10_000);
    }
  });

  it("applies the configured grace period before counting late days", () => {
    const rules = { ...noGrace, graceDays: 3 };
    assert.deepEqual(
      calcularEncargos(installment("2026-01-10"), rules, "2026-01-13"),
      { diasAtraso: 3, multa: 0, juros: 0, total: 100_000 },
    );
    assert.deepEqual(
      calcularEncargos(installment("2026-01-10"), rules, "2026-01-14"),
      { diasAtraso: 4, multa: 10_000, juros: 33, total: 110_033 },
    );
  });

  it("handles month lengths, year changes, and leap years using calendar days", () => {
    const cases = [
      ["2025-02-28", "2025-03-01", 1],
      ["2024-02-29", "2024-03-01", 1],
      ["2026-04-30", "2026-05-01", 1],
      ["2026-01-31", "2026-02-01", 1],
      ["2025-12-31", "2026-01-01", 1],
    ] as const;
    for (const [dueDate, referenceDate, days] of cases) {
      assert.equal(calcularEncargos(installment(dueDate), noGrace, referenceDate).diasAtraso, days);
    }
  });

  it("supports zero-value installments and rejects invalid values or calendar dates", () => {
    assert.deepEqual(
      calcularEncargos(installment("2026-01-10", 0), noGrace, "2026-01-11"),
      { diasAtraso: 1, multa: 0, juros: 0, total: 0 },
    );
    assert.throws(() => calcularEncargos(installment("2026-01-10", -1), noGrace, "2026-01-11"));
    assert.throws(() => calcularEncargos(installment("2026-02-30"), noGrace, "2026-03-01"));
  });

  it("rejects fractional configuration values instead of introducing floating-point money", () => {
    const invalidRules: FinancialLateRules = { ...noGrace, fineRateBasisPoints: 10.5 };
    assert.throws(() => calcularEncargos(installment("2026-01-10"), invalidRules, "2026-01-11"));
  });
});
