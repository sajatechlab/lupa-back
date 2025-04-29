import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiigoService } from './siigo.service';
import { SiigoController } from './siigo.controller';
import { SiigoToken } from './entities/siigo-token.entity';
import { Company } from '../company/entities/company.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceLine } from '../invoice/entities/invoice-line.entity';
import { InvoiceRepository } from 'src/invoice/invoice.repository';
import { SiigoRepository } from './siigo.repository';
import { EInvoiceProviderRepository } from 'src/company/einvoice-provider.repository';
import { EInvoiceProvider } from 'src/company/entities/einovice-provider.entity';
@Module({
  controllers: [SiigoController],
  imports: [
    TypeOrmModule.forFeature([
      SiigoToken,
      Company,
      Invoice,
      InvoiceLine,
      EInvoiceProvider,
    ]),
  ],
  providers: [
    SiigoService,
    SiigoRepository,
    InvoiceRepository,
    EInvoiceProviderRepository,
  ],
  exports: [SiigoService],
})
export class SiigoModule {}
