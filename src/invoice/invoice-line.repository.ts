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
        quantity: line.quantity,
        unitPrice: line.priceAmount,
        taxAmount: line.taxTotalAmount,
        salesUnitPrice: line.lineExtensionAmount,
      };
    });
  }
}
