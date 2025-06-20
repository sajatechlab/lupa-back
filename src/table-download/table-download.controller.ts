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
  NotFoundException,
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
import { AttachmentsService } from '../attachments/attachments.service';

@Controller('table-download')
export class TableDownloadController {
  constructor(
    private readonly tableDownloadService: TableDownloadService,
    private readonly sentInvoicesQueue: SentInvoicesQueue,
    private readonly receivedInvoicesQueue: ReceivedInvoicesQueue,
    private readonly downloadLocalService: DownloadLocalService,
    @InjectQueue(ZIP_GENERATION_QUEUE) private readonly zipQueue: Queue,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  // --- NEW ASYNC ENDPOINTS ---
  @Public()
  @Post('start-zip-generation')
  async startZipGeneration(@Body() payload: ZipJobPayload) {
    const job = await this.zipQueue.add('zip-generation', payload, {
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

    const s3Key = job.returnvalue as string;
    if (!s3Key) {
      throw new HttpException(
        'Job result (file key) not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const { buffer, contentType } =
        await this.attachmentsService.downloadFile(s3Key);

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="dian-export-${jobId}.zip"`,
      );
      res.send(buffer);
    } catch (error) {
      console.error(
        `Failed to download file ${s3Key} from cloud storage:`,
        error,
      );
      if (error instanceof NotFoundException) {
        throw new HttpException(
          'File not found in cloud storage.',
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        'Failed to retrieve file.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
