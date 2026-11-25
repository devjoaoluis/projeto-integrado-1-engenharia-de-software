import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import { OwnerPayoutReport } from "../../domain/entities/OwnerPayoutReport";

/**
 * Caso de uso: Gerar documento PDF do Relatório de Repasse ao Proprietário (HU-16 / RF18).
 * Gera um documento A4 profissional contendo a prestação de contas, detalhamento de recebimentos,
 * desconto da taxa de administração e valor líquido apurado.
 */
export class GenerateOwnerPayoutPdf {
  async execute(report: OwnerPayoutReport): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 40;
    const printableWidth = pageWidth - margin * 2;
    const bottomMargin = 50;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Sanitização para padrão WinAnsi suportado pelo pdf-lib
    const sanitize = (text: string): string => {
      return (text || "")
        .replace(/[^\u0020-\u007E\u00A0-\u00FF\n\r\t]/g, " ")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
    };

    const formatMoney = (val: number): string => {
      const fixed = val.toFixed(2);
      const [intPart, decPart] = fixed.split(".");
      const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `R$ ${formattedInt},${decPart}`;
    };

    const formatDate = (timestamp: number): string => {
      const d = new Date(timestamp);
      const day = String(d.getUTCDate()).padStart(2, "0");
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    };

    const checkPageBreak = (neededHeight: number): PDFPage => {
      if (currentY - neededHeight < bottomMargin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }
      return currentPage;
    };

    // 1. Cabeçalho / Banner Superior
    currentPage.drawRectangle({
      x: margin,
      y: currentY - 50,
      width: printableWidth,
      height: 50,
      color: rgb(0.08, 0.25, 0.48),
    });

    currentPage.drawText("RELATÓRIO MENSAL DE REPASSE AO PROPRIETÁRIO", {
      x: margin + 16,
      y: currentY - 24,
      size: 13,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    currentPage.drawText("Prestação de Contas de Locação de Imóveis • RF18", {
      x: margin + 16,
      y: currentY - 40,
      size: 9,
      font: regularFont,
      color: rgb(0.85, 0.9, 1),
    });

    currentY -= 65;

    // 2. Metadados e Dados do Proprietário
    currentPage.drawRectangle({
      x: margin,
      y: currentY - 55,
      width: printableWidth,
      height: 55,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
    });

    currentPage.drawText(`Proprietário: ${sanitize(report.owner.name)}`, {
      x: margin + 12,
      y: currentY - 18,
      size: 10,
      font: boldFont,
      color: rgb(0.1, 0.15, 0.25),
    });

    const docStr = report.owner.cpfCnpj ? `CPF/CNPJ: ${sanitize(report.owner.cpfCnpj)}` : "CPF/CNPJ: Não informado";
    currentPage.drawText(docStr, {
      x: margin + 12,
      y: currentY - 32,
      size: 9,
      font: regularFont,
      color: rgb(0.3, 0.35, 0.45),
    });

    const contactStr = `Telefone: ${sanitize(report.owner.phone || "—")} | E-mail: ${sanitize(report.owner.email || "—")}`;
    currentPage.drawText(contactStr, {
      x: margin + 12,
      y: currentY - 46,
      size: 9,
      font: regularFont,
      color: rgb(0.3, 0.35, 0.45),
    });

    // Coluna da direita do box de metadados
    const rightColX = margin + printableWidth - 170;
    currentPage.drawText(`Competência: ${report.referenceMonth}`, {
      x: rightColX,
      y: currentY - 18,
      size: 10,
      font: boldFont,
      color: rgb(0.08, 0.25, 0.48),
    });

    currentPage.drawText(`Emissão: ${formatDate(report.issuedAt)}`, {
      x: rightColX,
      y: currentY - 32,
      size: 9,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    currentPage.drawText(`Taxa Adm: ${report.adminFeePercent}%`, {
      x: rightColX,
      y: currentY - 46,
      size: 9,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    currentY -= 70;

    // 3. Cards de Resumo Financeiro
    const cardGap = 10;
    const cardWidth = (printableWidth - cardGap * 2) / 3;
    const cardHeight = 48;

    // Card 1: Total Recebido
    currentPage.drawRectangle({
      x: margin,
      y: currentY - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: rgb(0.95, 0.98, 0.95),
      borderColor: rgb(0.75, 0.88, 0.75),
      borderWidth: 1,
    });
    currentPage.drawText("TOTAL RECEBIDO", {
      x: margin + 10,
      y: currentY - 16,
      size: 8,
      font: boldFont,
      color: rgb(0.15, 0.5, 0.2),
    });
    currentPage.drawText(formatMoney(report.totalGrossAmount), {
      x: margin + 10,
      y: currentY - 36,
      size: 12,
      font: boldFont,
      color: rgb(0.1, 0.4, 0.15),
    });

    // Card 2: Taxa de Administração Descontada
    const card2X = margin + cardWidth + cardGap;
    currentPage.drawRectangle({
      x: card2X,
      y: currentY - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: rgb(0.99, 0.96, 0.92),
      borderColor: rgb(0.95, 0.8, 0.65),
      borderWidth: 1,
    });
    currentPage.drawText(`TAXA ADM (${report.adminFeePercent}%)`, {
      x: card2X + 10,
      y: currentY - 16,
      size: 8,
      font: boldFont,
      color: rgb(0.75, 0.4, 0.1),
    });
    currentPage.drawText(`- ${formatMoney(report.totalAdminFeeAmount)}`, {
      x: card2X + 10,
      y: currentY - 36,
      size: 12,
      font: boldFont,
      color: rgb(0.75, 0.35, 0.05),
    });

    // Card 3: Valor Líquido do Repasse
    const card3X = margin + (cardWidth + cardGap) * 2;
    currentPage.drawRectangle({
      x: card3X,
      y: currentY - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: rgb(0.93, 0.96, 1),
      borderColor: rgb(0.65, 0.8, 0.98),
      borderWidth: 1.5,
    });
    currentPage.drawText("VALOR LÍQUIDO DO REPASSE", {
      x: card3X + 10,
      y: currentY - 16,
      size: 8,
      font: boldFont,
      color: rgb(0.08, 0.25, 0.55),
    });
    currentPage.drawText(formatMoney(report.totalNetAmount), {
      x: card3X + 10,
      y: currentY - 36,
      size: 12,
      font: boldFont,
      color: rgb(0.05, 0.2, 0.5),
    });

    currentY -= cardHeight + 20;

    // 4. Título da Tabela de Detalhamento
    checkPageBreak(30);
    currentPage.drawText("DISCRIMINAÇÃO DOS PAGAMENTOS RECEBIDOS E REPASSES", {
      x: margin,
      y: currentY - 10,
      size: 10,
      font: boldFont,
      color: rgb(0.1, 0.15, 0.25),
    });
    currentY -= 18;

    // Colunas da Tabela
    const colX = {
      data: margin + 4,
      imovel: margin + 65,
      locatario: margin + 215,
      bruto: margin + 345,
      taxa: margin + 425,
      liquido: margin + 500,
    };

    // Cabeçalho da Tabela
    currentPage.drawRectangle({
      x: margin,
      y: currentY - 18,
      width: printableWidth,
      height: 18,
      color: rgb(0.92, 0.94, 0.97),
    });

    currentPage.drawText("Data", { x: colX.data, y: currentY - 13, size: 8, font: boldFont, color: rgb(0.2, 0.25, 0.35) });
    currentPage.drawText("Imóvel", { x: colX.imovel, y: currentY - 13, size: 8, font: boldFont, color: rgb(0.2, 0.25, 0.35) });
    currentPage.drawText("Locatário", { x: colX.locatario, y: currentY - 13, size: 8, font: boldFont, color: rgb(0.2, 0.25, 0.35) });
    currentPage.drawText("Valor Pago", { x: colX.bruto, y: currentY - 13, size: 8, font: boldFont, color: rgb(0.2, 0.25, 0.35) });
    currentPage.drawText("Taxa Adm", { x: colX.taxa, y: currentY - 13, size: 8, font: boldFont, color: rgb(0.2, 0.25, 0.35) });
    currentPage.drawText("Líquido", { x: colX.liquido, y: currentY - 13, size: 8, font: boldFont, color: rgb(0.2, 0.25, 0.35) });

    currentY -= 20;

    if (report.items.length === 0) {
      checkPageBreak(35);
      currentPage.drawRectangle({
        x: margin,
        y: currentY - 28,
        width: printableWidth,
        height: 28,
        color: rgb(0.98, 0.98, 0.98),
        borderColor: rgb(0.88, 0.88, 0.88),
        borderWidth: 0.5,
      });
      currentPage.drawText("Nenhum pagamento recebido dos locatários para esta competência.", {
        x: margin + 12,
        y: currentY - 18,
        size: 9,
        font: regularFont,
        color: rgb(0.45, 0.45, 0.45),
      });
      currentY -= 35;
    } else {
      for (let i = 0; i < report.items.length; i++) {
        const item = report.items[i];
        checkPageBreak(20);

        if (i % 2 === 1) {
          currentPage.drawRectangle({
            x: margin,
            y: currentY - 18,
            width: printableWidth,
            height: 18,
            color: rgb(0.98, 0.98, 0.99),
          });
        }

        currentPage.drawLine({
          start: { x: margin, y: currentY - 18 },
          end: { x: margin + printableWidth, y: currentY - 18 },
          thickness: 0.5,
          color: rgb(0.9, 0.92, 0.94),
        });

        // Limitar largura dos textos
        const clipText = (txt: string, maxLen: number) => {
          const s = sanitize(txt);
          return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
        };

        currentPage.drawText(formatDate(item.paidAt), { x: colX.data, y: currentY - 13, size: 8, font: regularFont, color: rgb(0.2, 0.2, 0.2) });
        currentPage.drawText(clipText(item.propertyTitle, 26), { x: colX.imovel, y: currentY - 13, size: 8, font: regularFont, color: rgb(0.1, 0.1, 0.1) });
        currentPage.drawText(clipText(item.tenantName, 22), { x: colX.locatario, y: currentY - 13, size: 8, font: regularFont, color: rgb(0.1, 0.1, 0.1) });
        currentPage.drawText(formatMoney(item.grossAmount), { x: colX.bruto, y: currentY - 13, size: 8, font: regularFont, color: rgb(0.15, 0.4, 0.15) });
        currentPage.drawText(`- ${formatMoney(item.adminFeeAmount)}`, { x: colX.taxa, y: currentY - 13, size: 8, font: regularFont, color: rgb(0.65, 0.3, 0.05) });
        currentPage.drawText(formatMoney(item.netAmount), { x: colX.liquido, y: currentY - 13, size: 8, font: boldFont, color: rgb(0.08, 0.25, 0.5) });

        currentY -= 19;
      }

      // Linha de Totalização da Tabela
      checkPageBreak(24);
      currentPage.drawRectangle({
        x: margin,
        y: currentY - 20,
        width: printableWidth,
        height: 20,
        color: rgb(0.93, 0.95, 0.98),
      });

      currentPage.drawText("TOTAL GERAL", { x: colX.data, y: currentY - 14, size: 8.5, font: boldFont, color: rgb(0.1, 0.2, 0.35) });
      currentPage.drawText(formatMoney(report.totalGrossAmount), { x: colX.bruto, y: currentY - 14, size: 8.5, font: boldFont, color: rgb(0.1, 0.4, 0.15) });
      currentPage.drawText(`- ${formatMoney(report.totalAdminFeeAmount)}`, { x: colX.taxa, y: currentY - 14, size: 8.5, font: boldFont, color: rgb(0.7, 0.3, 0.05) });
      currentPage.drawText(formatMoney(report.totalNetAmount), { x: colX.liquido, y: currentY - 14, size: 9, font: boldFont, color: rgb(0.05, 0.2, 0.5) });

      currentY -= 30;
    }

    // 5. Termo de Prestação de Contas & Assinatura
    checkPageBreak(70);
    currentPage.drawText(
      "Declaramos para os devidos fins a exatidao dos valores recebidos e repassados referentes a administracao dos imoveis acima especificados.",
      {
        x: margin,
        y: currentY - 10,
        size: 8,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4),
      }
    );

    currentY -= 45;

    // Linhas de assinatura
    const signWidth = 180;
    currentPage.drawLine({
      start: { x: margin + 20, y: currentY },
      end: { x: margin + 20 + signWidth, y: currentY },
      thickness: 0.8,
      color: rgb(0.5, 0.5, 0.5),
    });

    currentPage.drawText("Locus Gestao Imobiliaria", {
      x: margin + 45,
      y: currentY - 12,
      size: 8.5,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    const sign2X = margin + printableWidth - signWidth - 20;
    currentPage.drawLine({
      start: { x: sign2X, y: currentY },
      end: { x: sign2X + signWidth, y: currentY },
      thickness: 0.8,
      color: rgb(0.5, 0.5, 0.5),
    });

    currentPage.drawText(sanitize(report.owner.name), {
      x: sign2X + 25,
      y: currentY - 12,
      size: 8.5,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // 6. Rodapé em todas as páginas
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      const pageNumberText = `Pagina ${i + 1} de ${totalPages}`;
      const textWidth = regularFont.widthOfTextAtSize(pageNumberText, 8.5);
      const textX = (pageWidth - textWidth) / 2;

      page.drawLine({
        start: { x: margin, y: 35 },
        end: { x: pageWidth - margin, y: 35 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });

      page.drawText(pageNumberText, {
        x: textX,
        y: 22,
        size: 8.5,
        font: regularFont,
        color: rgb(0.45, 0.45, 0.45),
      });

      page.drawText("Locus - Sistema de Gestao Imobiliaria", {
        x: margin,
        y: 22,
        size: 8,
        font: regularFont,
        color: rgb(0.55, 0.55, 0.55),
      });
    }

    return await pdfDoc.save();
  }
}
