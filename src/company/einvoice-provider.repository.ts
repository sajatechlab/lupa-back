import { Injectable } from '@nestjs/common';
import { InvoiceProvider } from './entities/einovice-provider.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EInvoiceProviderRepository {
  constructor(
    @InjectRepository(InvoiceProvider)
    private readonly worldOfficeRepository: Repository<InvoiceProvider>,
  ) {}

  async findByCompanyId(companyId: string): Promise<InvoiceProvider> {
    return this.worldOfficeRepository.findOne({ where: { companyId } });
  }

  async save(worldOffice: Partial<InvoiceProvider>): Promise<InvoiceProvider> {
    return this.worldOfficeRepository.save(worldOffice);
  }

  async update(
    companyId: string,
    providerInfo: Partial<InvoiceProvider>,
  ): Promise<void> {
    await this.worldOfficeRepository.update({ companyId }, providerInfo);
  }
}
