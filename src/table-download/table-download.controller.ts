import { Controller, Post, Body } from '@nestjs/common';
import { TableDownloadService } from './table-download.service';
import { SentInvoicesQueue } from './sent-invoices.queue';
import { ReceivedInvoicesQueue } from './received-invoices.queue';

@Controller('table-download')
export class TableDownloadController {
  constructor(
    private readonly tableDownloadService: TableDownloadService,
    private readonly sentInvoicesQueue: SentInvoicesQueue,
    private readonly receivedInvoicesQueue: ReceivedInvoicesQueue,
  ) {}

  @Post()
  async download(
    @Body()
    data: {
      authUrl: string;
      startDate: string;
      endDate: string;
      recibidos: boolean;
      enviados: boolean;
      nit: string;
      jobId: string;
    },
  ) {
    const job = data.recibidos
      ? await this.receivedInvoicesQueue.addJob(data)
      : await this.sentInvoicesQueue.addJob(data);

    await new Promise((resolve) => setTimeout(resolve, 120000));
    return {
      jobId: job.id,
      message: 'Download job queued successfully',
    };
  }

  @Post('status')
  async getJobStatus(@Body('jobId') jobId: string) {
    return (
      this.sentInvoicesQueue.getJobStatus(jobId) ||
      this.receivedInvoicesQueue.getJobStatus(jobId)
    );
  }
}
