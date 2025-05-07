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

  async findAll(
    type?: InvoiceType,
    sort?: { field: string; order: 'ASC' | 'DESC' }[],
    startDate?: string,
    endDate?: string,
    thirdPartyId?: string,
    quickFilter?: string,
  ): Promise<Invoice[]> {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.company', 'company')
      .leftJoinAndSelect('invoice.thirdParty', 'thirdParty')
      .leftJoinAndSelect('invoice.lines', 'lines');

    if (type) {
      queryBuilder.where('invoice.type = :type', { type });
    }
    if (sort) {
      sort.forEach((sortItem) => {
        queryBuilder.addOrderBy(`invoice.${sortItem.field}`, sortItem.order);
      });
    }
    if (startDate) {
      queryBuilder.andWhere('invoice.issueDate >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      queryBuilder.andWhere('invoice.issueDate <= :endDate', {
        endDate: new Date(endDate),
      });
    }
    if (thirdPartyId) {
      queryBuilder.andWhere('invoice.thirdPartyId = :thirdPartyId', {
        thirdPartyId,
      });
    }
    if (quickFilter) {
      queryBuilder.andWhere(
        '(invoice.invoiceNumber LIKE :quickFilter OR thirdParty.name LIKE :quickFilter OR thirdParty.nit LIKE :quickFilter)',
        {
          quickFilter: `%${quickFilter}%`, // Use wildcard for partial matching
        },
      );
    }
    return queryBuilder.getMany();
    // return this.invoiceRepository.find({
    //   where: type ? { type: type as InvoiceType } : {},
    //   relations: ['company', 'thirdParty', 'lines'],
    // });
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
    sort?: { field: string; order: 'ASC' | 'DESC' }[],
    startDate?: string,
    endDate?: string,
    thirdPartyId?: string,
    quickFilter?: string,
  ): Promise<Invoice[]> {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.type = :type', { type })
      .leftJoinAndSelect('invoice.company', 'company')
      .leftJoinAndSelect('invoice.thirdParty', 'thirdParty')
      .leftJoinAndSelect('invoice.lines', 'lines');

    if (startDate) {
      queryBuilder.andWhere('invoice.issueDate >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      queryBuilder.andWhere('invoice.issueDate <= :endDate', {
        endDate: new Date(endDate),
      });
    }
    if (thirdPartyId) {
      queryBuilder.andWhere('invoice.thirdPartyId = :thirdPartyId', {
        thirdPartyId,
      });
    }
    if (quickFilter) {
      const upperQuickFilter = quickFilter.toUpperCase(); // Convert quickFilter to uppercase
      queryBuilder.andWhere(
        '(UPPER(invoice.invoiceNumber) LIKE :quickFilter OR UPPER(thirdParty.name) LIKE :quickFilter OR UPPER(thirdParty.nit) LIKE :quickFilter)',
        {
          quickFilter: `%${upperQuickFilter}%`, // Use wildcard for partial matching
        },
      );
    }
    // Apply sorting if provided
    if (sort && sort.length > 0) {
      sort.forEach(({ field, order }) => {
        // Check if the field is from the thirdParty table
        if (field === 'thirdParty.name') {
          queryBuilder.addOrderBy(
            'thirdParty.name',
            order.toUpperCase() as 'ASC' | 'DESC',
          );
        } else {
          queryBuilder.addOrderBy(
            `invoice.${field}`,
            order.toUpperCase() as 'ASC' | 'DESC',
          );
        }
      });
    } else {
      // Default sorting if none provided (optional)
      queryBuilder.addOrderBy('invoice.invoiceNumber', 'ASC');
    }
    return queryBuilder.getMany();
    // return this.invoiceRepository.find({
    //   where: { companyId, type: type as InvoiceType },
    //   relations: ['company', 'thirdParty', 'lines'], // Include related company data if needed
    // });
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
