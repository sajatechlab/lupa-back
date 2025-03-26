import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TableDownloadService } from './table-download.service';
import { TableDownloadController } from './table-download.controller';
import { Company } from '../company/entities/company.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceLine } from '../invoice/entities/invoice-line.entity';
import { SoftwareProvider } from '../software-provider/entities/software-provider.entity';
import { AttachmentsModule } from '../attachments/attachments.module';
@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Company, Invoice, InvoiceLine, SoftwareProvider]),
    AttachmentsModule,
  ],
  controllers: [TableDownloadController],
  providers: [TableDownloadService],
  exports: [TableDownloadService],
})
export class TableDownloadModule {}
