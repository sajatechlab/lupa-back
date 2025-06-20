import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { TableDownloadService } from './table-download.service';
import { TableDownloadController } from './table-download.controller';
import { SentInvoicesQueue } from './sent-invoices.queue';
import { ReceivedInvoicesQueue } from './received-invoices.queue';
import { ReceivedInvoicesProcessor } from './received-invoices.processor';
import { SentInvoicesProcessor } from './sent-invoices.processor';
import { Company } from '../company/entities/company.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceLine } from '../invoice/entities/invoice-line.entity';
import { SoftwareProvider } from '../software-provider/entities/software-provider.entity';
import { AttachmentsModule } from '../attachments/attachments.module';
import { DownloadLocalService } from './download-local.service';
import {
  ZipGenerationProcessor,
  ZIP_GENERATION_QUEUE,
  ZipFileProcessingProcessor,
  ZIP_FILE_PROCESSING_QUEUE,
} from './zip-generation.processor';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Company, Invoice, InvoiceLine, SoftwareProvider]),
    AttachmentsModule,
    BullModule.registerQueue(
      {
        name: 'sent-invoices',
      },
      { name: 'received-invoices' },
      {
        name: ZIP_GENERATION_QUEUE,
      },
      { name: ZIP_FILE_PROCESSING_QUEUE },
    ),
  ],
  controllers: [TableDownloadController],
  providers: [
    TableDownloadService,
    ReceivedInvoicesQueue,
    SentInvoicesQueue,
    ReceivedInvoicesProcessor,
    SentInvoicesProcessor,
    DownloadLocalService,
    ZipGenerationProcessor,
    ZipFileProcessingProcessor,
  ],
  exports: [
    TableDownloadService,
    ReceivedInvoicesQueue,
    SentInvoicesQueue,
    DownloadLocalService,
  ],
})
export class TableDownloadModule {}
