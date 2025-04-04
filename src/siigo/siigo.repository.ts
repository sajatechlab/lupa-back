import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceLine } from '../invoice/entities/invoice-line.entity';
import { SiigoToken } from './entities/siigo-token.entity';
import { In } from 'typeorm';
import { InvoiceType } from '../invoice/enums/invoice-type.enum';

@Injectable()
export class SiigoRepository {
  constructor(
    @InjectRepository(SiigoToken)
    private siigoTokenRepository: Repository<SiigoToken>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLine)
    private invoiceLineRepository: Repository<InvoiceLine>,
  ) {}

  async findInvoicesWithRelations(invoiceIds: string[]) {
    return this.invoiceRepository.find({
      where: {
        uuid: In(invoiceIds),
        type: InvoiceType.RECEIVED,
      },
      relations: ['lines', 'thirdParty'],
    });
  }

  async saveToken(
    accessToken: string,
    tokenExpiration: number,
    companyId: string,
  ) {
    await this.siigoTokenRepository.delete({ companyId });

    const token = this.siigoTokenRepository.create({
      accessToken,
      tokenExpiration,
      companyId,
    });

    return this.siigoTokenRepository.save(token);
  }

  async findValidToken(companyId: string) {
    return this.siigoTokenRepository.findOne({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteToken(companyId: string) {
    await this.siigoTokenRepository.delete({ companyId });
  }

  async createToken(token: SiigoToken) {
    return this.siigoTokenRepository.create(token);
  }
}
