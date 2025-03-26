import { Injectable } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceType } from './enums/invoice-type.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { AttachmentsService } from '../attachments/attachments.service';
import { InvoiceLineRepository } from './invoice-line.repository';
export interface InvoiceMetrics {
  received: {
    totalInvoices: number;
    totalAmount: number;
    invoicesPosted: number;
    invoicesNotPosted: number;
  };
  sent: {
    totalInvoices: number;
    totalAmount: number;
    invoicesPosted: number;
    invoicesNotPosted: number;
  };
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly attachmentsService: AttachmentsService,
    private readonly invoiceLineRepository: InvoiceLineRepository,
  ) {}

  // create(createInvoiceDto: CreateInvoiceDto) {
  //   return this.invoiceRepository.create(createInvoiceDto);
  // }

  findAll(type?: InvoiceType) {
    return this.invoiceRepository.findAll(type);
  }

  async getInvoiceMetrics(): Promise<InvoiceMetrics> {
    return this.invoiceRepository.getInvoiceMetrics();
  }

  // findOne(uuid: string) {
  //   return this.invoiceRepository.findByUuid(uuid);
  // }

  // update(uuid: string, updateInvoiceDto: UpdateInvoiceDto) {
  //   // Add update method to repository if needed
  //   return `This action updates invoice ${uuid}`;
  // }

  // remove(uuid: string) {
  //   // Add remove method to repository if needed
  //   return `This action removes invoice ${uuid}`;
  // }

  async downloadFile(id: string) {
    const invoice = await this.invoiceRepository.findOne(id);
    const fileName = invoice.fileName.replace('.xml', '.pdf');
    return this.attachmentsService.downloadFile(`${fileName}`);
  }

  async getLines(id: string) {
    return this.invoiceLineRepository.getLinesByInvoice(id);
  }
}
