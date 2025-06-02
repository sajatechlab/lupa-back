import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TableDownloadService } from './table-download.service';
import { TableDownloadJobData } from './received-invoices.queue';

@Processor('received-invoices')
export class ReceivedInvoicesProcessor {
  constructor(private readonly tableDownloadService: TableDownloadService) {}

  @Process('download')
  async handleDownload(job: Job<TableDownloadJobData>) {
    console.log(`Starting job ${job.id}`);
    console.debug(`Processing job ${job.id}`);
    console.debug('Job data:', job.data);

    try {
      const result =
        await this.tableDownloadService.authenticateTabulateAndDownload(
          job.data.authUrl,
          job.data.startDate,
          job.data.endDate,
          job.data.recibidos,
          job.data.enviados,
          job.data.nit,
          job.data.jobId,
        );

      return result;
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  }
}
