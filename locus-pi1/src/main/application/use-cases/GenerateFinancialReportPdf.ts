import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { FinancialReport, FinancialReportEntry } from "../../domain/entities/FinancialReport";

export class GenerateFinancialReportPdf {
  async execute(report: FinancialReport): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const width = 595.28;
    const height = 841.89;
    const margin = 36;
    const contentWidth = width - margin * 2;
    const bottom = 54;
    let page: PDFPage = pdf.addPage([width, height]);
    let y = height - margin;
    let activeSection: string | null = null;

    const clean = (value: string) => value.replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, " ");
    const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    const date = (timestamp: number | null) => {
      if (timestamp == null) return "—";
      const value = new Date(timestamp);
      return `${String(value.getUTCDate()).padStart(2, "0")}/${String(value.getUTCMonth() + 1).padStart(2, "0")}/${value.getUTCFullYear()}`;
    };
    const drawText = (
      text: string,
      x: number,
      yPosition: number,
      size = 8,
      font = regular,
      color = rgb(0.16, 0.18, 0.22),
    ) => page.drawText(clean(text), { x, y: yPosition, size, font, color });
    const addPage = () => {
      page = pdf.addPage([width, height]);
      y = height - margin;
    };
    const drawTableHeader = () => {
      const top = y;
      page.drawRectangle({
        x: margin,
        y: top - 27,
        width: contentWidth,
        height: 27,
        color: rgb(0.91, 0.92, 0.95),
      });
      drawText("Locatário / competência", margin + 6, top - 17, 7, bold);
      drawText("Venc. / recebido", margin + 130, top - 17, 7, bold);
      drawText("Aluguel + extras", margin + 220, top - 17, 7, bold);
      drawText("Encargos", margin + 310, top - 17, 7, bold);
      drawText("Total", margin + 365, top - 17, 7, bold);
      drawText("Taxa", margin + 425, top - 17, 7, bold);
      drawText("Situação", margin + 470, top - 17, 7, bold);
      y -= 27;
    };
    const drawSectionHeading = (title: string, address: string) => {
      page.drawRectangle({
        x: margin,
        y: y - 28,
        width: contentWidth,
        height: 28,
        color: rgb(0.96, 0.97, 0.98),
        borderColor: rgb(0.85, 0.87, 0.9),
        borderWidth: 0.5,
      });
      drawText(clean(title), margin + 7, y - 12, 9, bold);
      drawText(clean(address), margin + 7, y - 23, 7, regular, rgb(0.38, 0.4, 0.45));
      y -= 34;
      activeSection = title;
      drawTableHeader();
    };
    const ensureRowSpace = () => {
      if (y - 32 >= bottom) return;
      addPage();
      if (activeSection) drawSectionHeading(activeSection, "");
    };
    const drawEntry = (entry: FinancialReportEntry, index: number) => {
      ensureRowSpace();
      if (index % 2 === 1) {
        page.drawRectangle({
          x: margin,
          y: y - 31,
          width: contentWidth,
          height: 31,
          color: rgb(0.985, 0.986, 0.99),
        });
      }
      const encargoCents = entry.fineCents + entry.interestCents;
      const status = entry.status === "RECEBIDO" ? "Recebido" : entry.status === "EM_ATRASO" ? "Em atraso" : "A vencer";
      drawText(entry.tenantName, margin + 6, y - 12, 7, bold);
      drawText(entry.referenceMonth, margin + 6, y - 23, 7);
      drawText(`${date(entry.dueDate)} / ${date(entry.paidAt)}`, margin + 130, y - 17, 7);
      drawText(money(entry.rentCents + entry.extrasCents), margin + 220, y - 17, 7);
      drawText(money(encargoCents), margin + 310, y - 17, 7);
      drawText(money(entry.totalCents), margin + 365, y - 17, 7, bold);
      drawText(money(entry.adminFeeCents), margin + 425, y - 17, 7);
      drawText(status, margin + 470, y - 17, 7, bold);
      page.drawLine({
        start: { x: margin, y: y - 31 },
        end: { x: width - margin, y: y - 31 },
        thickness: 0.35,
        color: rgb(0.88, 0.89, 0.91),
      });
      y -= 32;
    };

    page.drawRectangle({
      x: margin,
      y: y - 48,
      width: contentWidth,
      height: 48,
      color: rgb(0.17, 0.18, 0.24),
    });
    drawText("RELATÓRIO FINANCEIRO DE LOCAÇÃO", margin + 12, y - 21, 12, bold, rgb(1, 1, 1));
    drawText(`${clean(report.ownerName)} · ${date(report.issuedAt)}`, margin + 12, y - 37, 8, regular, rgb(0.9, 0.91, 0.95));
    y -= 64;

    drawText(`Período: ${date(Date.parse(`${report.periodStart}T00:00:00Z`))} a ${date(Date.parse(`${report.periodEnd}T00:00:00Z`))}`, margin, y, 9, bold);
    y -= 24;
    const summaries = [
      ["TOTAL RECEBIDO", report.totals.receivedCents, rgb(0.9, 0.96, 0.91)],
      ["EM ATRASO", report.totals.overdueCents, rgb(0.99, 0.92, 0.92)],
      ["A VENCER", report.totals.dueCents, rgb(0.99, 0.97, 0.9)],
    ] as const;
    const cardGap = 8;
    const cardWidth = (contentWidth - cardGap * 2) / 3;
    summaries.forEach(([label, amount, color], index) => {
      const x = margin + index * (cardWidth + cardGap);
      page.drawRectangle({
        x,
        y: y - 42,
        width: cardWidth,
        height: 42,
        color,
        borderColor: rgb(0.85, 0.86, 0.88),
        borderWidth: 0.5,
      });
      drawText(label, x + 7, y - 15, 7, bold);
      drawText(money(amount), x + 7, y - 32, 10, bold);
    });
    y -= 57;
    drawText(`Taxa de administração: ${(report.adminFeeBasisPoints / 100).toFixed(2)}%`, margin, y, 8);
    y -= 24;

    let rowIndex = 0;
    for (const property of report.properties) {
      if (y - 65 < bottom) addPage();
      drawSectionHeading(property.title, property.address);
      if (property.entries.length === 0) {
        ensureRowSpace();
        drawText("Nenhum lançamento para este imóvel no período.", margin + 6, y - 16, 8);
        y -= 32;
      } else {
        for (const entry of property.entries) drawEntry(entry, rowIndex++);
      }
      if (y - 28 < bottom) {
        addPage();
        drawSectionHeading(property.title, property.address);
      }
      page.drawRectangle({
        x: margin,
        y: y - 20,
        width: contentWidth,
        height: 20,
        color: rgb(0.92, 0.93, 0.95),
      });
      drawText(`Subtotal do imóvel: ${money(property.subtotalCents)}`, margin + 7, y - 13, 8, bold);
      y -= 30;
    }

    const pages = pdf.getPages();
    pages.forEach((current, index) => {
      current.drawLine({
        start: { x: margin, y: 38 },
        end: { x: width - margin, y: 38 },
        thickness: 0.5,
        color: rgb(0.82, 0.83, 0.85),
      });
      current.drawText(`LOCUS · Página ${index + 1} de ${pages.length}`, {
        x: width / 2 - 52,
        y: 23,
        size: 8,
        font: regular,
        color: rgb(0.4, 0.42, 0.46),
      });
    });
    return pdf.save();
  }
}
