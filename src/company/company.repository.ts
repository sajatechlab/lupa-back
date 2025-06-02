import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateAuthDianUrlDto } from './dto/create-auth-dian-url.dto';

interface CompanyWithUsers extends Company {
  hasUsers: boolean;
}

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

  async findByNit(nit: string): Promise<CompanyWithUsers> {
    const company = await this.companyRepository
      .createQueryBuilder('company')
      .where('company.nit = :nit', { nit })
      .getOne();

    if (company) {
      const hasUsers = await this.companyRepository.query(
        'SELECT EXISTS(SELECT 1 FROM user_companies WHERE company_id = $1)',
        [company.id],
      );
      return { ...company, hasUsers: hasUsers[0].exists };
    }

    return null;
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

  async updateAuthInfo(dto: CreateAuthDianUrlDto): Promise<Company> {
    const company = await this.findFirst({
      where: { nit: dto.nit },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    await this.update(company.id, {
      legalRepDocumentType: dto.legalRepDocumentType,
      legalRepDocumentNumber: dto.legalRepDocumentNumber,
    });

    return company;
  }

  async getThirdPartyCompaniesByCompany(companyId: string): Promise<Company[]> {
    return this.companyRepository
      .createQueryBuilder('company')
      .distinct()
      .innerJoin('invoice', 'invoice', 'invoice."thirdPartyId" = company.id')
      .where('invoice."companyId" = :companyId', { companyId })
      .getMany();
  }
}
