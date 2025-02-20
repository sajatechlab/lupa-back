import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { PrismaService } from '../prisma.service';
import { CompanyRepository } from 'src/company/company.repository';
import { CompanyModule } from 'src/company/company.module';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository, PrismaService, CompanyRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
