import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CompanyRepository } from './company.repository';
import { PrismaService } from '../prisma.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [CompanyController],
  providers: [CompanyService, CompanyRepository, PrismaService],
  exports: [CompanyService, CompanyRepository],
})
export class CompanyModule {}
