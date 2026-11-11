import { describe, it, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { initializeDatabase } from "../../../infrastructure/database/initializeDatabase";
import { FillContractTemplate } from "../FillContractTemplate";
import { GenerateContractPdf } from "../GenerateContractPdf";
import { AssembleContractData } from "../AssembleContractData";
import { DEFAULT_RENTAL_CONTRACT_TEMPLATE } from "../defaultContractTemplate";

const sqlite = createClient({ url: "file::memory:" });
const dbModule = require.resolve("../../../infrastructure/database/db");
const previousDb = require.cache[dbModule];
require.cache[dbModule] = { exports: { db: drizzle(sqlite) } } as NodeModule;

// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolated database
const { DrizzlePropertyRepository } = require("../../../infrastructure/repositories/DrizzlePropertyRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolated database
const { DrizzleClientRepository } = require("../../../infrastructure/repositories/DrizzleClientRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolated database
const { DrizzleContactRepository } = require("../../../infrastructure/repositories/DrizzleContactRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolated database
const { DrizzleRentalRepository } = require("../../../infrastructure/repositories/DrizzleRentalRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- isolated database
const { DrizzleContractTemplateRepository } = require("../../../infrastructure/repositories/DrizzleContractTemplateRepository");
// eslint-disable-next-line @typescript-eslint/no-var-requires -- schema
const { owners, guarantors } = require("../../../infrastructure/database/schema/contacts");

const propertyRepo = new DrizzlePropertyRepository();
const clientRepo = new DrizzleClientRepository();
const ownerRepo = new DrizzleContactRepository(owners);
const guarantorRepo = new DrizzleContactRepository(guarantors);
const rentalRepo = new DrizzleRentalRepository();
const templateRepo = new DrizzleContractTemplateRepository();

const assembleContractData = new AssembleContractData(
  propertyRepo,
  clientRepo,
  ownerRepo,
  guarantorRepo,
  rentalRepo,
  templateRepo
);

before(async () => {
  await initializeDatabase(sqlite);
});

beforeEach(async () => {
  await sqlite.execute("DELETE FROM property_payments");
  await sqlite.execute("DELETE FROM property_inspections");
  await sqlite.execute("DELETE FROM property_maintenances");
  await sqlite.execute("DELETE FROM property_contracts");
  await sqlite.execute("DELETE FROM rentals");
  await sqlite.execute("DELETE FROM properties");
  await sqlite.execute("DELETE FROM clients");
  await sqlite.execute("DELETE FROM owners");
  await sqlite.execute("DELETE FROM guarantors");
  await sqlite.execute("DELETE FROM contract_templates");
});

after(() => {
  sqlite.close();
  if (previousDb) require.cache[dbModule] = previousDb;
  else delete require.cache[dbModule];
});

describe("HU11 Contract Generation and Auto-filling", () => {
  const fillTemplate = new FillContractTemplate();

  it("automatically fills property, owner, and tenant placeholders", () => {
    const template = "Contrato de Aluguel\n" +
      "Imóvel: {{imovel.endereco}} - {{imovel.bairro}}\n" +
      "Proprietário: {{proprietario.nome}} (CPF: {{proprietario.cpf}})\n" +
      "Locatário: {{locatario.nome}} (CPF: {{locatario.cpf}})\n" +
      "Valor: {{aluguel.valor}}, vencimento dia {{aluguel.vencimento}}\n" +
      "Período: de {{aluguel.inicio}} até {{aluguel.fim}}";

    const result = fillTemplate.execute({
      templateContent: template,
      property: {
        address: "Rua das Flores, 123",
        neighborhood: "Jardins",
        price: 2500,
      },
      owner: {
        name: "Carlos Alberto",
        cpfCnpj: "11122233344",
        phone: "11988887777",
        email: "carlos@email.com",
      },
      tenant: {
        name: "Maria da Silva",
        cpfCnpj: "55566677788",
        phone: "11977776666",
        email: "maria@email.com",
      },
      rental: {
        monthlyRent: 2500,
        dueDay: 5,
        startDate: new Date("2026-11-01T00:00:00").getTime(),
        endDate: new Date("2027-11-01T00:00:00").getTime(),
      },
      currentDate: new Date("2026-10-28T12:00:00"),
    });

    assert.ok(result.filledContent.includes("Rua das Flores, 123 - Jardins"));
    assert.ok(result.filledContent.includes("Carlos Alberto (CPF: 111.222.333-44)"));
    assert.ok(result.filledContent.includes("Maria da Silva (CPF: 555.666.777-88)"));
    assert.ok(result.filledContent.includes("2.500,00"));
    assert.ok(result.filledContent.includes("vencimento dia 5"));
    assert.ok(result.filledContent.includes("01/11/2026"));
    assert.ok(result.filledContent.includes("01/11/2027"));
    assert.equal(result.replacementsCount, 10);
  });

  it("supports snake_case and whitespace in placeholders", () => {
    const template = "Locatário: {{ locatario_nome }} | Endereço: {{ imovel_endereco }}";
    const result = fillTemplate.execute({
      templateContent: template,
      property: { address: "Av. Paulista, 1000", price: 3000 },
      tenant: { name: "João Pedro" },
    });

    assert.equal(result.filledContent, "Locatário: João Pedro | Endereço: Av. Paulista, 1000");
    assert.equal(result.replacementsCount, 2);
  });

  it("handles missing optional fields gracefully without throwing", () => {
    const template = "Proprietário: {{proprietario.nome}} | Fiador: {{fiador.nome}}";
    const result = fillTemplate.execute({
      templateContent: template,
      property: { address: "Rua X", price: 1000 },
      owner: null,
      tenant: { name: "Lucas" },
      guarantor: null,
    });

    assert.ok(result.filledContent.includes("Proprietário não informado"));
    assert.ok(result.filledContent.includes("Não informado"));
  });
});

describe("HU11 PDF Generation", () => {
  const generatePdf = new GenerateContractPdf();

  it("generates a valid A4 PDF document starting with %PDF", async () => {
    const pdfBytes = await generatePdf.execute({
      title: "Contrato de Locação Residencial",
      content: "Cláusula Primeira: O imóvel destina-se a fins residenciais.\n\n" +
        "Cláusula Segunda: O aluguel mensal será pago em dia.",
    });

    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.length > 500);

    const header = Buffer.from(pdfBytes.slice(0, 5)).toString("utf8");
    assert.equal(header, "%PDF-");

    const loaded = await PDFDocument.load(pdfBytes);
    assert.equal(loaded.getPageCount(), 1);
  });

  it("handles large multi-page contracts and adds pagination", async () => {
    const longContent = Array.from({ length: 60 }, (_, i) =>
      `Cláusula ${i + 1}: O locatário declara estar ciente de todas as normas do condomínio e da lei do inquilinato.`
    ).join("\n\n");

    const pdfBytes = await generatePdf.execute({
      title: "Contrato Extenso de Locação",
      content: longContent,
    });

    assert.ok(pdfBytes.length > 1000);
    const loaded = await PDFDocument.load(pdfBytes);
    assert.ok(loaded.getPageCount() > 1);
  });
});

describe("HU11 Contract Data Assembly with Database", () => {
  it("assembles property, owner, and associated tenant from database", async () => {
    const now = Date.now();

    // Create owner
    const owner = await ownerRepo.create({
      id: "owner-1",
      name: "José Proprietário",
      cpfCnpj: "12345678901",
      phone: "11999990000",
      email: "jose@proprietario.com",
      createdAt: now,
      updatedAt: now,
    });

    // Create property
    const property = await propertyRepo.create({
      id: "prop-1",
      title: "Apartamento Centro",
      address: "Rua Central, 500",
      neighborhood: "Centro",
      bedrooms: 2,
      price: 1800,
      iptu: 150,
      type: "Apartamento",
      status: "DISPONIVEL",
      ownerId: owner.id,
      createdAt: now,
      updatedAt: now,
    });

    // Create tenant
    const tenant = await clientRepo.create({
      id: "tenant-1",
      name: "Ana Locatária",
      cpfCnpj: "98765432100",
      phone: "11988881111",
      email: "ana@locataria.com",
      type: "TENANT",
      createdAt: now,
      updatedAt: now,
    });

    // Associate rental
    await rentalRepo.create({
      id: "rental-1",
      propertyId: property.id,
      tenantId: tenant.id,
      monthlyRent: 1800,
      startDate: now,
      dueDay: 10,
      contractSigned: false,
      signaturesNotarized: false,
      initialPaymentsPaid: false,
      createdAt: now,
      updatedAt: now,
    });

    // Save a custom template
    const template = await templateRepo.create({
      id: "tpl-1",
      name: "Modelo Residencial Centro",
      content: "CONTRATO:\nImóvel: {{imovel.endereco}}\nLocador: {{proprietario.nome}}\nLocatário: {{locatario.nome}}\nValor: {{aluguel.valor}}",
      createdAt: now,
      updatedAt: now,
    });

    // Assemble with custom template
    const result = await assembleContractData.execute({
      propertyId: property.id,
      templateId: template.id,
    });

    assert.equal(result.templateName, "Modelo Residencial Centro");
    assert.equal(result.property.id, property.id);
    assert.equal(result.owner?.name, "José Proprietário");
    assert.equal(result.tenant?.name, "Ana Locatária");
    assert.ok(result.filledContent.includes("Rua Central, 500"));
    assert.ok(result.filledContent.includes("José Proprietário"));
    assert.ok(result.filledContent.includes("Ana Locatária"));
    assert.ok(result.filledContent.includes("1.800,00"));
  });

  it("uses default template when no templateId is provided", async () => {
    const now = Date.now();
    const property = await propertyRepo.create({
      id: "prop-2",
      title: "Casa de Vila",
      address: "Vila Mariana, 42",
      price: 2200,
      status: "DISPONIVEL",
      createdAt: now,
      updatedAt: now,
    });

    const result = await assembleContractData.execute({
      propertyId: property.id,
    });

    assert.equal(result.templateName, "Modelo Padrão de Locação");
    assert.ok(result.filledContent.includes("CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL"));
    assert.ok(result.filledContent.includes("Vila Mariana, 42"));
  });

  it("rejects non-existent property id", async () => {
    await assert.rejects(
      assembleContractData.execute({ propertyId: "inexistente" }),
      /não encontrado/
    );
  });
});

describe("HU11 Contracts IPC Registration and PDF Export", () => {
  it("registers contracts IPC handlers and exports PDF to target path", async () => {
    const electronModule = require.resolve("electron");
    const previous = require.cache[electronModule];
    const handlers = new Map<string, (event: unknown, data?: unknown) => Promise<unknown>>();

    require.cache[electronModule] = {
      exports: {
        ipcMain: {
          handle: (name: string, handler: (event: unknown, data?: unknown) => Promise<unknown>) =>
            handlers.set(name, handler),
        },
        dialog: {
          showSaveDialog: async () => ({ canceled: true }),
        },
      },
    } as NodeModule;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolate IPC
      const { registerContractsIpc } = require("../../../ipc/contracts.ipc");
      registerContractsIpc();

      const registeredKeys = [...handlers.keys()];
      assert.ok(registeredKeys.includes("contracts:assemble-data"));
      assert.ok(registeredKeys.includes("contracts:fill-template"));
      assert.ok(registeredKeys.includes("contracts:generate-pdf"));
      assert.ok(registeredKeys.includes("contracts:export-pdf"));
      assert.ok(registeredKeys.includes("contracts:get-default-template"));

      // Test PDF generation via IPC
      const genResult = (await handlers.get("contracts:generate-pdf")(
        {},
        { title: "Teste IPC", content: "Texto do contrato de teste." }
      )) as { base64: string };
      assert.ok(genResult.base64);
      const decoded = Buffer.from(genResult.base64, "base64");
      assert.equal(decoded.slice(0, 5).toString("utf8"), "%PDF-");

      // Test export to file
      const tempFile = path.join(os.tmpdir(), `test-contrato-${Date.now()}.pdf`);
      const exportResult = (await handlers.get("contracts:export-pdf")(
        {},
        {
          title: "Contrato Exportado",
          content: "Conteúdo do contrato exportado com sucesso.",
          targetPath: tempFile,
        }
      )) as { success: boolean; filePath: string };

      assert.equal(exportResult.success, true);
      assert.equal(exportResult.filePath, tempFile);

      const fileStat = await fs.stat(tempFile);
      assert.ok(fileStat.size > 500);
      const fileBytes = await fs.readFile(tempFile);
      assert.equal(fileBytes.slice(0, 5).toString("utf8"), "%PDF-");

      // Clean up temp file
      await fs.unlink(tempFile);

      // Test default template
      const defaultTpl = await handlers.get("contracts:get-default-template")({});
      assert.equal(defaultTpl, DEFAULT_RENTAL_CONTRACT_TEMPLATE);
    } finally {
      if (previous) require.cache[electronModule] = previous;
      else delete require.cache[electronModule];
    }
  });
});
