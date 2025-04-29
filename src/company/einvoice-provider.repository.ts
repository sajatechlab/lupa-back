import { Injectable } from '@nestjs/common';
import { EInvoiceProvider } from './entities/einovice-provider.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EInvoiceProviderRepository {
  constructor(
    @InjectRepository(EInvoiceProvider)
    private readonly worldOfficeRepository: Repository<EInvoiceProvider>,
  ) {}

  async findByCompanyId(companyId: string): Promise<EInvoiceProvider> {
    return this.worldOfficeRepository.findOne({ where: { companyId } });
  }

  async save(
    worldOffice: Partial<EInvoiceProvider>,
  ): Promise<EInvoiceProvider> {
    return this.worldOfficeRepository.save(worldOffice);
  }

  async update(
    companyId: string,
    providerInfo: Partial<EInvoiceProvider>,
  ): Promise<void> {
    await this.worldOfficeRepository.update({ companyId }, providerInfo);
  }
}
