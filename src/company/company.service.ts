import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyRepository } from './company.repository';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UserRepository } from 'src/user/user.repository';
@Injectable()
export class CompanyService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async create(createCompanyDto: CreateCompanyDto, userId: number) {
    const existingCompany = await this.companyRepository.findByNit(
      createCompanyDto.nit,
    );
    if (existingCompany) {
      throw new BadRequestException('Company already exists');
    }
    console.log('existingCompany', existingCompany);

    const company = await this.companyRepository.create(createCompanyDto);
    console.log('company', company);

    await this.userRepository.update(userId, company);
    return company;
  }

  findAll() {
    return this.companyRepository.findAll();
  }

  findAllByUser(userId: number) {
    return this.companyRepository.findAllByUser(userId);
  }

  async findOne(id: string) {
    const company = await this.companyRepository.findOne(id);
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    await this.findOne(id); // Verify existence
    return this.companyRepository.update(id, updateCompanyDto);
  }

  async remove(id: string) {
    await this.findOne(id); // Verify existence
    return this.companyRepository.remove(id);
  }
}
