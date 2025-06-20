import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Res,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TableDownloadService } from './table-download.service';
import { SentInvoicesQueue } from './sent-invoices.queue';
import { ReceivedInvoicesQueue } from './received-invoices.queue';
import { DownloadLocalService } from './download-local.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  ZIP_GENERATION_QUEUE,
  ZipJobPayload,
} from './zip-generation.processor';
import { Response } from 'express';
import * as fs from 'fs';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('table-download')
export class TableDownloadController {
  constructor(
    private readonly tableDownloadService: TableDownloadService,
    private readonly sentInvoicesQueue: SentInvoicesQueue,
    private readonly receivedInvoicesQueue: ReceivedInvoicesQueue,
    private readonly downloadLocalService: DownloadLocalService,
    @InjectQueue(ZIP_GENERATION_QUEUE) private readonly zipQueue: Queue,
  ) {}

  // --- NEW ASYNC ENDPOINTS ---
  @Public()
  @Post('start-zip-generation')
  async startZipGeneration(@Body() payload: ZipJobPayload) {
    const job = await this.zipQueue.add(payload, {
      attempts: 2,
      removeOnComplete: false,
      removeOnFail: false,
    });
    return { jobId: job.id };
  }

  @Public()
  @Get('zip-status/:jobId')
  async getZipStatus(@Param('jobId') jobId: string) {
    const job = await this.zipQueue.getJob(jobId);
    if (!job) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }
    return {
      jobId: job.id,
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  @Public()
  @Get('download-zip/:jobId')
  async downloadZip(@Param('jobId') jobId: string, @Res() res: Response) {
    const job = await this.zipQueue.getJob(jobId);
    if (!job) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }
    if ((await job.getState()) !== 'completed') {
      throw new HttpException(
        'Job is not yet complete',
        HttpStatus.BAD_REQUEST,
      );
    }

    const filePath = job.returnvalue;
    if (!filePath || !fs.existsSync(filePath)) {
      throw new HttpException('Result file not found.', HttpStatus.NOT_FOUND);
    }

    res.download(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
    });
  }

  // --- EXISTING ENDPOINTS ---
  @Public()
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

  @Public()
  @Post('status')
  async getJobStatus(@Body('jobId') jobId: string) {
    return this.sentInvoicesQueue.getJobStatus(jobId);
    // || this.receivedInvoicesQueue.getJobStatus(jobId)
  }

  @Public()
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
    // THIS WILL NO LONGER WORK AS EXPECTED
    const buffer = await this.downloadLocalService.generateZipBuffer(
      authUrl,
      startDate,
      endDate,
      recibidos,
      enviados,
      nit,
      'some-job-id', // This method now requires a job ID
    );
    res.setHeader('Content-Disposition', `attachment; filename=luup.zip`);
    res.setHeader('Content-Type', 'application/zip');
    res.send(buffer); // This will fail, as the service now returns a path string, not a buffer.
  }
}
