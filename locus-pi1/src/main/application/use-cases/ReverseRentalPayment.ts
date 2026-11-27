import { IPropertyHistoryRepository } from "../../domain/repositories/IPropertyHistoryRepository";

export class ReverseRentalPayment {
  constructor(private historyRepository: IPropertyHistoryRepository) {}

  async execute(paymentId: string, reversedBy: string | null = null): Promise<void> {
    if (typeof paymentId !== "string" || !paymentId.trim()) {
      throw new Error("Selecione o recebimento que deseja desfazer.");
    }
    if (!this.historyRepository.findPaymentById || !this.historyRepository.reversePayment) {
      throw new Error("O histórico financeiro não permite desfazer recebimentos.");
    }
    const payment = await this.historyRepository.findPaymentById(paymentId.trim());
    if (!payment) throw new Error("O recebimento não foi encontrado.");
    if (payment.reversedAt != null) throw new Error("Este recebimento já foi desfeito.");
    await this.historyRepository.reversePayment(
      payment.id,
      Date.now(),
      reversedBy,
      "Recebimento desfeito pelo usuário.",
    );
  }
}
