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
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    invoices: Invoice[];
    total: number;
    page: number;
    totalPages: number;
  }> {
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
      queryBuilder.addOrderBy('invoice.issueDate', 'DESC');
    }
    // Pagination logic
    console.log('page', page, 'limit', limit);

    const [invoices, total] = await queryBuilder
      .skip((page - 1) * limit) // Skip records for the current page
      .take(limit) // Limit the number of records returned
      .getManyAndCount(); // Get both the records and the total count

    const totalPages = Math.ceil(total / limit); // Calculate total pages

    return { invoices, total, page, totalPages }; // Return invoices and pagination info
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

  async save(invoices: Invoice[]): Promise<Invoice[]> {
    return this.invoiceRepository.save(invoices);
  }

  async getCompanyDashboardMetrics(companyId: string) {
    // Get oldest invoice date
    const oldestInvoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .orderBy('invoice.issueDate', 'ASC')
      .select('invoice.issueDate')
      .getOne();

    // Get basic invoice counts
    const invoiceCounts = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .select([
        'COUNT(CASE WHEN invoice.type = :received THEN 1 END) as "receivedCount"',
        'COUNT(CASE WHEN invoice.type = :sent THEN 1 END) as "sentCount"',
        'COUNT(CASE WHEN invoice.isPosted = true THEN 1 END) as "postedCount"',
        'COALESCE(SUM(CASE WHEN invoice.type = :received THEN invoice."invoiceTaxTotalTaxAmount" ELSE 0 END), 0) as "receivedTaxTotal"',
        'COALESCE(SUM(CASE WHEN invoice.type = :sent THEN invoice."invoiceTaxTotalTaxAmount" ELSE 0 END), 0) as "sentTaxTotal"',
      ])
      .setParameter('received', 'RECEIVED')
      .setParameter('sent', 'SENT')
      .getRawOne();

    // Get monthly incomes (last 6 months)
    const monthlyIncomes = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.type = :type', { type: 'SENT' })
      .andWhere('invoice.issueDate >= :sixMonthsAgo', {
        sixMonthsAgo: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      })
      .select([
        "DATE_TRUNC('month', invoice.issueDate) as month",
        'SUM(invoice."invoiceTaxInclusiveAmount") as amount',
      ])
      .groupBy('month')
      .orderBy('month', 'DESC')
      .getRawMany();

    // Get monthly outcomes (last 6 months)
    const monthlyOutcomes = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.type = :type', { type: 'RECEIVED' })
      .andWhere('invoice.issueDate >= :sixMonthsAgo', {
        sixMonthsAgo: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      })
      .select([
        "DATE_TRUNC('month', invoice.issueDate) as month",
        'SUM(invoice."invoiceTaxInclusiveAmount") as amount',
      ])
      .groupBy('month')
      .orderBy('month', 'DESC')
      .getRawMany();

    // Get top 5 clients
    const topClients = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.thirdParty', 'thirdParty')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.type = :type', { type: 'SENT' })
      .select([
        'thirdParty.name as name',
        'SUM(invoice."invoiceTaxInclusiveAmount") as total',
      ])
      .groupBy('thirdParty.name')
      .orderBy('total', 'DESC')
      .limit(5)
      .getRawMany();

    // Get top 5 suppliers
    const topSuppliers = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.thirdParty', 'thirdParty')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.type = :type', { type: 'RECEIVED' })
      .select([
        'thirdParty.name as name',
        'SUM(invoice."invoiceTaxInclusiveAmount") as total',
      ])
      .groupBy('thirdParty.name')
      .orderBy('total', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      oldestInvoiceDate: oldestInvoice?.issueDate,
      invoiceCounts: {
        received: Number(invoiceCounts.receivedCount),
        sent: Number(invoiceCounts.sentCount),
        posted: Number(invoiceCounts.postedCount),
      },
      taxTotals: {
        received: Number(invoiceCounts.receivedTaxTotal),
        sent: Number(invoiceCounts.sentTaxTotal),
      },
      monthlyIncomes: monthlyIncomes.map((item) => ({
        month: item.month,
        amount: Number(item.amount),
      })),
      monthlyOutcomes: monthlyOutcomes.map((item) => ({
        month: item.month,
        amount: Number(item.amount),
      })),
      topClients: topClients.map((item) => ({
        name: item.name,
        total: Number(item.total),
      })),
      topSuppliers: topSuppliers.map((item) => ({
        name: item.name,
        total: Number(item.total),
      })),
    };
  }
}
