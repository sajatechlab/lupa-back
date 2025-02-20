import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceLine } from './entities/invoice-line.entity';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceLineRepository } from './invoice-line.repository';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, InvoiceLine])],
  providers: [InvoiceRepository, InvoiceLineRepository, InvoiceService],
  controllers: [InvoiceController],
  exports: [InvoiceRepository, InvoiceLineRepository],
})
export class InvoiceModule {}
