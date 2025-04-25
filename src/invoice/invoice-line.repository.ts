import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceLine } from './entities/invoice-line.entity';

@Injectable()
export class InvoiceLineRepository {
  constructor(
    @InjectRepository(InvoiceLine)
    private invoiceLineRepository: Repository<InvoiceLine>,
  ) {}

  async create(data: Partial<InvoiceLine>): Promise<InvoiceLine> {
    const line = this.invoiceLineRepository.create(data);
    return this.invoiceLineRepository.save(line);
  }

  async findByInvoice(invoiceId: string): Promise<InvoiceLine[]> {
    return this.invoiceLineRepository.find({
      where: { invoiceId },
      relations: ['invoice'],
    });
  }

  async getLinesByInvoice(invoiceId: string): Promise<any[]> {
    const lines = await this.invoiceLineRepository.find({
      where: { invoiceId: invoiceId },
    });
    return lines.map((line) => {
      return {
        lineId: line.lineID,
        description: line.itemDescription,
        itemId: line.standardItemID,
        quantity: Number(line.quantity),
        unitPrice: Number(line.priceAmount),
        taxAmount: Number(line.taxTotalAmount),
        salesUnitPrice: Number(line.lineExtensionAmount),
        taxPercent: Number(line.taxPercent),
        taxAmountSecondary: Number(line.taxAmountSecondary),
        taxPercentSecondary: Number(line.taxPercentSecondary),
        discount: Number(line.discount),
      };
    });
  }
}
