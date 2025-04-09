import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Company } from '../company/entities/company.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async createUser(data: { name: string; email: string; password: string }) {
    return this.userRepository.save({
      name: data.name,
      email: data.email,
      password: data.password,
    });
  }

  async findUserByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: number, data: any) {
    const user = await this.userRepository.findOne({ where: { id } });
    const company = await this.companyRepository.findOne({
      where: { id: data.id },
    });

    if (user && company) {
      user.companies = [...(user.companies || []), company];
      return this.userRepository.save(user);
    }
  }

  async updateUser(email: string, data: any) {
    return this.userRepository.update({ email }, data);
  }
}
