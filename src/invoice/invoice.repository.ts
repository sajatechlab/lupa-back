import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceType } from './enums/invoice-type.enum';
import { InvoiceMetrics } from './invoice.service';

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

  async getInvoiceMetrics(): Promise<InvoiceMetrics> {
    const receivedMetrics = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.type = :type', { type: 'RECEIVED' })
      .select([
        'COUNT(*) as "totalInvoices"',
        'COALESCE(SUM(invoice."invoiceTaxInclusiveAmount"), 0) as "totalAmount"',
        'COUNT(CASE WHEN invoice.isPosted = true THEN 1 END) as "invoicesPosted"',
        'COUNT(CASE WHEN invoice.isPosted = false THEN 1 END) as "invoicesNotPosted"',
      ])
      .getRawOne();

    const sentMetrics = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.type = :type', { type: 'SENT' })
      .select([
        'COUNT(*) as "totalInvoices"',
        'COALESCE(SUM(invoice."invoiceTaxInclusiveAmount"), 0) as "totalAmount"',
        'COUNT(CASE WHEN invoice.isPosted = true THEN 1 END) as "invoicesPosted"',
        'COUNT(CASE WHEN invoice.isPosted = false THEN 1 END) as "invoicesNotPosted"',
      ])
      .getRawOne();

    return {
      received: {
        totalInvoices: Number(receivedMetrics.totalInvoices),
        totalAmount: Number(receivedMetrics.totalAmount),
        invoicesPosted: Number(receivedMetrics.invoicesPosted),
        invoicesNotPosted: Number(receivedMetrics.invoicesNotPosted),
      },
      sent: {
        totalInvoices: Number(sentMetrics.totalInvoices),
        totalAmount: Number(sentMetrics.totalAmount),
        invoicesPosted: Number(sentMetrics.invoicesPosted),
        invoicesNotPosted: Number(sentMetrics.invoicesNotPosted),
      },
    };
  }

  async findInvoicesWithRelations(invoiceIds: string[]) {
    const invoices = await this.invoiceRepository.find({
      where: {
        uuid: In(invoiceIds),
        type: InvoiceType.RECEIVED,
      },
      relations: {
        lines: true,
        company: true,
        thirdParty: true,
      },
    });

    return invoices.map((invoice) => ({
      ...invoice,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
      issueDate: new Date(invoice.issueDate),
    }));
  }
  async findByCompanyId(
    companyId: string,
    type: InvoiceType,
  ): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { companyId, type: type as InvoiceType },
      relations: ['company', 'thirdParty', 'lines'], // Include related company data if needed
    });
  }
  async getCompanyMetrics(companyId: string): Promise<InvoiceMetrics> {
    const receivedMetrics = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.type = :type', { type: 'RECEIVED' })
      .andWhere('invoice.companyId = :companyId', { companyId })
      .select([
        'COUNT(*) as "totalInvoices"',
        'COALESCE(SUM(invoice."invoiceTaxInclusiveAmount"), 0) as "totalAmount"',
        'COUNT(CASE WHEN invoice.isPosted = true THEN 1 END) as "invoicesPosted"',
        'COUNT(CASE WHEN invoice.isPosted = false THEN 1 END) as "invoicesNotPosted"',
      ])
      .getRawOne();

    const sentMetrics = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.type = :type', { type: 'SENT' })
      .andWhere('invoice.companyId = :companyId', { companyId })
      .select([
        'COUNT(*) as "totalInvoices"',
        'COALESCE(SUM(invoice."invoiceTaxInclusiveAmount"), 0) as "totalAmount"',
        'COUNT(CASE WHEN invoice.isPosted = true THEN 1 END) as "invoicesPosted"',
        'COUNT(CASE WHEN invoice.isPosted = false THEN 1 END) as "invoicesNotPosted"',
      ])
      .getRawOne();

    return {
      received: {
        totalInvoices: Number(receivedMetrics.totalInvoices),
        totalAmount: Number(receivedMetrics.totalAmount),
        invoicesPosted: Number(receivedMetrics.invoicesPosted),
        invoicesNotPosted: Number(receivedMetrics.invoicesNotPosted),
      },
      sent: {
        totalInvoices: Number(sentMetrics.totalInvoices),
        totalAmount: Number(sentMetrics.totalAmount),
        invoicesPosted: Number(sentMetrics.invoicesPosted),
        invoicesNotPosted: Number(sentMetrics.invoicesNotPosted),
      },
    };
  }
}
