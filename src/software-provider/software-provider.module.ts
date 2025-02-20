import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoftwareProvider } from './entities/software-provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SoftwareProvider])],
  exports: [TypeOrmModule],
})
export class SoftwareProviderModule {}
