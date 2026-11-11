import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

export interface GenerateContractPdfInput {
  title?: string;
  content: string;
  includeSignatures?: boolean;
}

export class GenerateContractPdf {
  async execute(input: GenerateContractPdfInput): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const printableWidth = pageWidth - margin * 2;
    const bottomMargin = 60;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    const bodyFontSize = 10;
    const bodyLineHeight = 14;
    const titleFontSize = 13;
    const titleLineHeight = 18;

    // Helper to sanitize text for WinAnsi encoding used by standard PDF fonts
    const sanitize = (text: string): string => {
      return text
        .replace(/[^\u0020-\u007E\u00A0-\u00FF\n\r\t]/g, " ")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
    };

    const checkPageBreak = (neededHeight: number): PDFPage => {
      if (currentY - neededHeight < bottomMargin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }
      return currentPage;
    };

    // Draw document title / header if provided
    if (input.title) {
      const sanitizedTitle = sanitize(input.title.toUpperCase());
      const titleWidth = boldFont.widthOfTextAtSize(sanitizedTitle, titleFontSize);
      const titleX = margin + Math.max(0, (printableWidth - titleWidth) / 2);

      checkPageBreak(titleLineHeight + 15);
      currentPage.drawText(sanitizedTitle, {
        x: titleX,
        y: currentY - titleFontSize,
        size: titleFontSize,
        font: boldFont,
        color: rgb(0.1, 0.2, 0.35),
      });
      currentY -= titleLineHeight + 15;
    }

    // Split content into paragraphs
    const paragraphs = sanitize(input.content).split("\n");

    for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
      const paragraph = paragraphs[pIndex].trimEnd();

      if (paragraph.trim().length === 0) {
        // Empty line / paragraph break
        currentY -= bodyLineHeight * 0.8;
        continue;
      }

      // Check if line is a section heading (all caps or starts with numbers/dashes or section title)
      const isHeader =
        (paragraph.length < 70 && paragraph === paragraph.toUpperCase() && /[A-Z]/.test(paragraph)) ||
        /^DO\s+[A-Z\s]+/.test(paragraph) ||
        /^DA\s+[A-Z\s]+/.test(paragraph) ||
        /^DAS\s+[A-Z\s]+/.test(paragraph) ||
        /^IDENTIFICAÇÃO\s+/i.test(paragraph);

      const font: PDFFont = isHeader ? boldFont : regularFont;
      const fontSize = isHeader ? bodyFontSize + 0.5 : bodyFontSize;
      const lineHeight = isHeader ? bodyLineHeight + 2 : bodyLineHeight;

      if (isHeader) {
        currentY -= 6;
      }

      // Wrap paragraph into lines
      const words = paragraph.split(/\s+/);
      let currentLine = "";

      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth <= printableWidth) {
          currentLine = testLine;
        } else {
          // Flush currentLine
          if (currentLine) {
            checkPageBreak(lineHeight);
            currentPage.drawText(currentLine, {
              x: margin,
              y: currentY - fontSize,
              size: fontSize,
              font: font,
              color: rgb(0.1, 0.1, 0.1),
            });
            currentY -= lineHeight;
          }
          currentLine = word;
        }
      }

      if (currentLine) {
        checkPageBreak(lineHeight);
        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY - fontSize,
          size: fontSize,
          font: font,
          color: rgb(0.1, 0.1, 0.1),
        });
        currentY -= lineHeight;
      }
    }

    // Add footer with page numbering across all pages
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      const pageNumberText = `Página ${i + 1} de ${totalPages}`;
      const textWidth = regularFont.widthOfTextAtSize(pageNumberText, 9);
      const textX = (pageWidth - textWidth) / 2;

      // Draw footer line
      page.drawLine({
        start: { x: margin, y: 38 },
        end: { x: pageWidth - margin, y: 38 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      page.drawText(pageNumberText, {
        x: textX,
        y: 25,
        size: 9,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    return await pdfDoc.save();
  }
}
