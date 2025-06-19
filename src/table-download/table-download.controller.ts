import { Controller, Post, Body, Get, Query, Res } from '@nestjs/common';
import { TableDownloadService } from './table-download.service';
import { SentInvoicesQueue } from './sent-invoices.queue';
import { ReceivedInvoicesQueue } from './received-invoices.queue';
import { DownloadLocalService } from './download-local.service';
import { start } from 'repl';
@Controller('table-download')
export class TableDownloadController {
  constructor(
    private readonly tableDownloadService: TableDownloadService,
    private readonly sentInvoicesQueue: SentInvoicesQueue,
    private readonly receivedInvoicesQueue: ReceivedInvoicesQueue,
    private readonly downloadLocalService: DownloadLocalService,
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
    const job = await this.sentInvoicesQueue.addJob(data);
    // data.recibidos
    //   ? await this.receivedInvoicesQueue.addJob(data)
    //   : await this.sentInvoicesQueue.addJob(data);

    await new Promise((resolve) => setTimeout(resolve, 120000));
    return {
      jobId: job.id,
      message: 'Download job queued successfully',
    };
  }

  @Post('status')
  async getJobStatus(@Body('jobId') jobId: string) {
    return this.sentInvoicesQueue.getJobStatus(jobId);
    // || this.receivedInvoicesQueue.getJobStatus(jobId)
  }

  @Post('/local-download')
  async downloadLocal(
    @Res() res,
    @Query('url') url,
    @Body()
    data: {
      authUrl: string;
      startDate: string;
      endDate: string;
      recibidos: boolean;
      enviados: boolean;
      nit: string;
    },
  ) {
    const { authUrl, startDate, endDate, recibidos, enviados, nit } = data;
    const buffer = await this.downloadLocalService.generateZipBuffer(
      authUrl,
      startDate,
      endDate,
      recibidos,
      enviados,
      nit,
    );
    res.setHeader('Content-Disposition', `attachment; filename=luup.zip`);
    res.setHeader('Content-Type', 'application/zip');
    res.send(buffer);
  }
}
