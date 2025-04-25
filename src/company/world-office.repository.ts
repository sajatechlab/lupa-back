import { Injectable } from '@nestjs/common';
import { WorldOffice } from './entities/world-office.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class WorldOfficeRepository {
  constructor(
    @InjectRepository(WorldOffice)
    private readonly worldOfficeRepository: Repository<WorldOffice>,
  ) {}

  async findByCompanyId(companyId: string): Promise<WorldOffice> {
    return this.worldOfficeRepository.findOne({ where: { companyId } });
  }

  async save(worldOffice: Partial<WorldOffice>): Promise<WorldOffice> {
    return this.worldOfficeRepository.save(worldOffice);
  }

  async update(
    companyId: string,
    worldOffice: Partial<WorldOffice>,
  ): Promise<void> {
    await this.worldOfficeRepository.update({ companyId }, worldOffice);
  }
}
