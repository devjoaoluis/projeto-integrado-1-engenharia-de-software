import crypto from "node:crypto";
import path from "node:path";
import { PropertyPayment } from "../../domain/entities/PropertyHistory";
import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";
import { IRentalRepository } from "../../domain/repositories/IRentalRepository";
import { IFileStorage } from "../../domain/repositories/IFileStorage";
import { ListPayments } from "./ListPayments";

export interface SettleRentalInstallmentInput {
  rentalId: string;
  referenceMonth: string;
  paidAt?: number;
  receiptSourcePath?: string;
  receiptName?: string;
}

export interface SettleRentalInstallmentResult {
  payment: PropertyPayment;
  message: string;
}

export class SettleRentalInstallment {
  constructor(
    private rentalRepository: IRentalRepository,
    private historyRepository: IPropertyHistoryRepository,
    private listPayments: ListPayments,
    private fileStorage: IFileStorage,
  ) {}

  async execute(input: SettleRentalInstallmentInput): Promise<SettleRentalInstallmentResult> {
    if (!input || typeof input !== "object") throw new Error("Os dados da baixa são obrigatórios.");
    const rentalId = typeof input.rentalId === "string" ? input.rentalId.trim() : "";
    const referenceMonth = typeof input.referenceMonth === "string" ? input.referenceMonth.trim() : "";
    if (!rentalId) throw new Error("O ID da locação é obrigatório.");
    if (!referenceMonth || !/^(0[1-9]|1[0-2])\/\d{4}$/.test(referenceMonth)) {
      throw new Error("A competência deve estar no formato MM/AAAA.");
    }

    const paidAt = input.paidAt ?? Date.now();
    if (!Number.isFinite(paidAt) || paidAt < 0 || paidAt > Date.now()) {
      throw new Error("A data do pagamento deve ser válida e não pode estar no futuro.");
    }

    const rental = await this.rentalRepository.findById(rentalId);
    if (!rental) throw new Error("Locação não encontrada.");

    const history = await this.historyRepository.findByPropertyId(rental.propertyId);
    const contract = history.contracts.find((item) => item.rentalId === rental.id)
      ?? history.contracts.find((item) =>
        item.rentalId == null
        && item.propertyId === rental.propertyId
        && item.tenantId === rental.tenantId
        && item.status === "ACTIVE");
    if (!contract) throw new Error("Não existe contrato vinculado à locação selecionada.");
    if (history.payments.some((payment) => payment.contractId === contract.id && payment.referenceMonth === referenceMonth)) {
      throw new Error(`A parcela de ${referenceMonth} já possui uma baixa registrada.`);
    }

    const installment = (await this.listPayments.execute(rental.tenantId, paidAt)).find(
      (payment) => payment.rentalId === rental.id
        && payment.referenceMonth === referenceMonth
        && payment.status !== "PAGO",
    );
    if (!installment) {
      throw new Error(`Não há parcela pendente para a competência ${referenceMonth} nesta locação.`);
    }

    const id = crypto.randomUUID();
    let receiptPath: string | null = null;
    if (input.receiptSourcePath) {
      if (typeof input.receiptSourcePath !== "string") {
        throw new Error("O caminho do comprovante é inválido.");
      }
      const extension = path.extname(input.receiptSourcePath).toLowerCase();
      if (![".pdf", ".png", ".jpg", ".jpeg"].includes(extension)) {
        throw new Error("O comprovante deve ser PDF, PNG ou JPG.");
      }
      if (!(await this.fileStorage.exists(input.receiptSourcePath))) {
        throw new Error("O arquivo do comprovante não foi encontrado.");
      }
      receiptPath = await this.fileStorage.save(
        input.receiptSourcePath,
        "payment-receipts",
        `${id}${extension}`,
      );
    }

    const payment: PropertyPayment = {
      id,
      propertyId: rental.propertyId,
      contractId: contract.id,
      amount: installment.totalAmount,
      paidAt,
      description: `Baixa manual de aluguel - ${referenceMonth}`,
      createdAt: Date.now(),
      referenceMonth,
      dueDate: installment.dueDate,
      receiptPath,
    };

    try {
      await this.historyRepository.createPayment(payment);
    } catch (error) {
      if (receiptPath) await this.fileStorage.delete(receiptPath);
      throw error;
    }

    return {
      payment,
      message: `Parcela de ${referenceMonth} registrada como paga.`,
    };
  }
}
