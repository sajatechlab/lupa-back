import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class CompanyRepository {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async findAllByUser(userId: number): Promise<Company[]> {
    return this.companyRepository
      .createQueryBuilder('company')
      .innerJoinAndSelect('user_companies', 'uc', 'uc.company_id = company.id')
      .where('uc.user_id = :userId', { userId })
      .getMany();
  }

  async findOne(id: string): Promise<Company> {
    return this.companyRepository.findOne({
      where: { id },
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

  update(id: string, data: UpdateCompanyDto) {
    return this.companyRepository.update(id, data);
  }

  remove(id: string) {
    return this.companyRepository.delete(id);
  }
}
