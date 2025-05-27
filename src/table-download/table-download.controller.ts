import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { TableDownloadService } from './table-download.service';
import * as crypto from 'crypto';
@Controller('table-download')
export class TableDownloadController {
  constructor(private readonly tableDownloadService: TableDownloadService) {}

  @Post()
  async downloadAndTabulate(@Body() params: any) {
    console.log('prueba');

    const {
      authUrl,
      startDate,
      endDate,
      downloadPath,
      recibidos,
      enviados,
      nit,
    } = params;
    const jobId = crypto.randomUUID(); // Generate a unique job ID
    this.tableDownloadService.authenticateTabulateAndDownload(
      authUrl,
      startDate,
      endDate,
      recibidos,
      enviados,
      nit,
      jobId,
    );

    await new Promise(resolve => setTimeout(resolve, 120000));
    return {
      message: 'Download started',
      jobId: jobId,
    };
  }

  @Get('job-status/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.tableDownloadService.getJobStatus(jobId);
  }
}
