import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyRepository {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async findOne(id: string): Promise<Company> {
    return this.companyRepository.findOne({
      where: { id },
      relations: ['users', 'ownedInvoices', 'thirdPartyInvoices'],
    });
  }

  async findByNit(nit: string): Promise<Company> {
    return this.companyRepository.findOne({
      where: { nit },
    });
  }

  async create(data: Partial<Company>): Promise<Company> {
    const company = this.companyRepository.create(data);
    return this.companyRepository.save(company);
  }

  async findFirst(params: any): Promise<Company> {
    return this.companyRepository.findOne({
      where: params.where,
    });
  }

  findAll() {
    return this.companyRepository.find();
  }

  findAllByUser(userId: number) {
    return this.companyRepository.find({
      where: {
        users: {
          id: userId,
        },
      },
      relations: ['users'],
    });
  }

  update(id: string, data: UpdateCompanyDto) {
    return this.companyRepository.update(id, data);
  }

  remove(id: string) {
    return this.companyRepository.delete(id);
  }
}
