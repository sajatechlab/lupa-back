import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CompanyRepository } from './company.repository';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { UserModule } from '../user/user.module';
import { User } from '../user/entities/user.entity';
import { InvoiceModule } from 'src/invoice/invoice.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Company, User]),
    UserModule,
    InvoiceModule,
  ],
  providers: [CompanyRepository, CompanyService],
  controllers: [CompanyController],
  exports: [CompanyRepository],
})
export class CompanyModule {}
