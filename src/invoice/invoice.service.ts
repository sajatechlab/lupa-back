import { Injectable } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceRepository } from './invoice.repository';

@Injectable()
export class InvoiceService {
  constructor(private readonly invoiceRepository: InvoiceRepository) {}

  // create(createInvoiceDto: CreateInvoiceDto) {
  //   return this.invoiceRepository.create(createInvoiceDto);
  // }

  findAll(type?: 'SENT' | 'RECEIVED') {
    return this.invoiceRepository.findAll(type);
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
}
