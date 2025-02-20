import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceType } from './enums/invoice-type.enum';

@Injectable()
export class InvoiceRepository {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
  ) {}

  async findOne(uuid: string): Promise<Invoice> {
    return this.invoiceRepository.findOne({
      where: { uuid },
      relations: ['company', 'thirdParty', 'lines'],
    });
  }

  async create(data: Partial<Invoice>): Promise<Invoice> {
    const invoice = this.invoiceRepository.create(data);
    return this.invoiceRepository.save(invoice);
  }

  async findByCompany(companyId: string): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { companyId },
      relations: ['lines'],
    });
  }

  async findAll(type?: InvoiceType): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: type ? { type: type as InvoiceType } : {},
      relations: ['company', 'thirdParty', 'lines'],
    });
  }
}
