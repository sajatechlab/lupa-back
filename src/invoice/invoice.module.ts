import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { InvoiceRepository } from './invoice.repository';
import { PrismaService } from '../prisma.service';
@Module({
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceRepository, PrismaService],
  exports: [InvoiceRepository],
})
export class InvoiceModule {}
