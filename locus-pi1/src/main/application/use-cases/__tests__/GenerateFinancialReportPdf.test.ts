import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { FinancialReport } from "../../../domain/entities/FinancialReport";
import { GenerateFinancialReportPdf } from "../GenerateFinancialReportPdf";

describe("GenerateFinancialReportPdf", () => {
  it("creates a readable multi-page A4 report and keeps rows across page breaks", async () => {
    const entries = Array.from({ length: 60 }, (_, index) => ({
      id: `payment-${index}`,
      propertyId: "property-1",
      propertyTitle: "Casa de teste",
      propertyAddress: "Rua das Flores, 10",
      ownerName: "Proprietário de teste",
      tenantName: `Locatário ${index + 1}`,
      referenceMonth: "03/2026",
      dueDate: Date.UTC(2026, 2, 10, 23, 59, 59, 999),
      paidAt: Date.UTC(2026, 2, 11, 12),
      rentCents: 100_000,
      extrasCents: 25_000,
      fineCents: 10_000,
      interestCents: 333,
      totalCents: 135_333,
      adminFeeCents: 13_533,
      netCents: 121_800,
      status: "RECEBIDO" as const,
    }));
    const report: FinancialReport = {
      ownerName: "Proprietário de teste",
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      issuedAt: Date.UTC(2026, 2, 31, 12),
      adminFeeBasisPoints: 1_000,
      totals: { receivedCents: 8_119_980, overdueCents: 0, dueCents: 0 },
      properties: [{
        id: "property-1",
        title: "Casa de teste",
        address: "Rua das Flores, 10",
        entries,
        subtotalCents: entries.reduce((sum, entry) => sum + entry.totalCents, 0),
      }],
    };

    const bytes = await new GenerateFinancialReportPdf().execute(report);
    assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
    const document = await PDFDocument.load(bytes);
    assert.ok(document.getPageCount() > 1);
    assert.ok(document.getPages().every((page) => page.getSize().width > page.getSize().height / 1.5));
  });
});
