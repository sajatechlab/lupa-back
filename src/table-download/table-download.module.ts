import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TableDownloadService } from './table-download.service';
import { TableDownloadController } from './table-download.controller';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [TableDownloadController],
  providers: [TableDownloadService, PrismaService],
  exports: [TableDownloadService],
})
export class TableDownloadModule {}
