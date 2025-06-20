import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { DownloadLocalService } from './download-local.service';
import { FlowProducer, Queue, Worker } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { InjectQueue } from '@nestjs/bull';
import { AttachmentsService } from '../attachments/attachments.service';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import axios from 'axios';

export const ZIP_GENERATION_QUEUE = 'zip-generation';
export const ZIP_FILE_PROCESSING_QUEUE = 'zip-file-processing';

// This is the data structure for our job
export interface ZipJobPayload {
  authUrl: string;
  startDate: string;
  endDate: string;
  recibidos: boolean;
  enviados: boolean;
  nit: string;
}

@Processor(ZIP_GENERATION_QUEUE)
export class ZipGenerationProcessor {
  constructor(
    private readonly downloadService: DownloadLocalService,
    @InjectQueue(ZIP_FILE_PROCESSING_QUEUE) private readonly fileQueue: Queue,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Process()
  async handleZipGeneration(job: Job<ZipJobPayload>): Promise<string> {
    console.log(`Processing parent job ${job.id}...`);
    const { data } = job;

    // Authenticate with DIAN before calling getRows
    const jar = new CookieJar();
    const axiosInstance = wrapper(axios.create({ jar, withCredentials: true }));
    const authResponse = await axiosInstance.get(data.authUrl);
    if (authResponse.status !== 200) {
      throw new Error(
        `Authentication failed with status ${authResponse.status}`,
      );
    }
    console.log(`[Parent Job] Authenticated for job ${job.id}`);

    // 1. Gather all rows (files to process) using authenticated axiosInstance
    const allRows: Record<string, any>[] = [];
    if (data.recibidos) {
      const rows = await this.downloadService.getRows(
        'Received',
        data.startDate,
        data.endDate,
        data.nit,
        axiosInstance,
      );
      allRows.push(...rows);
    }
    if (data.enviados) {
      const rows = await this.downloadService.getRows(
        'Sent',
        data.startDate,
        data.endDate,
        data.nit,
        axiosInstance,
      );
      allRows.push(...rows);
    }

    // 2. Split into batches (e.g., BATCH_SIZE = 5)
    const BATCH_SIZE = 5;
    const batches = [];
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      batches.push(allRows.slice(i, i + BATCH_SIZE));
    }

    // 3. Add a child job for each batch
    const connection =
      (this.fileQueue as any).client || (this.fileQueue as any).connection;
    const flowProducer = new FlowProducer({ connection });
    const children = batches.map((batch, idx) => ({
      name: 'process-batch',
      queueName: ZIP_FILE_PROCESSING_QUEUE,
      data: {
        batch,
        batchIndex: idx,
        jobId: job.id,
        authUrl: data.authUrl,
        nit: data.nit,
      },
    }));
    const flow = await flowProducer.add({
      name: 'zip-generation',
      queueName: ZIP_GENERATION_QUEUE,
      data,
      children,
    });

    // 4. Wait for all children to complete
    const childResults: { name: string; buffer: Buffer }[] = [];
    for (const child of flow.children) {
      const childJobId = child.job.id;
      const childJob = await this.fileQueue.getJob(childJobId);
      const result = await childJob.waitUntilFinished(connection);
      childResults.push(...result);
    }

    // 5. Aggregate all files and create the final ZIP
    const zipBuffer = await this.downloadService.createZipFromBuffers(
      childResults,
      job.id.toString(),
    );

    // 6. Upload to Spaces
    const s3Key = `dian-exports/dian-export-${job.id}.zip`;
    await this.attachmentsService.uploadFile(zipBuffer, s3Key);
    console.log(`Uploaded ${s3Key} to cloud storage.`);

    return s3Key;
  }
}

// New processor for batch/file processing
@Processor(ZIP_FILE_PROCESSING_QUEUE)
export class ZipFileProcessingProcessor {
  constructor(private readonly downloadService: DownloadLocalService) {}

  @Process('process-batch')
  async handleBatch(
    job: Job<{
      batch: Record<string, any>[];
      batchIndex: number;
      jobId: string;
      authUrl: string;
      nit: string;
    }>,
  ) {
    const { batch, batchIndex, jobId, authUrl, nit } = job.data;
    console.log(
      `[Child Job] Processing batch ${batchIndex} for parent job ${jobId}`,
    );

    // Authenticate with DIAN for this batch
    const jar = new CookieJar();
    const axiosInstance = wrapper(axios.create({ jar, withCredentials: true }));
    const authResponse = await axiosInstance.get(authUrl);
    if (authResponse.status !== 200) {
      throw new Error(
        `Authentication failed with status ${authResponse.status}`,
      );
    }
    console.log(
      `[Child Job] Authenticated for batch ${batchIndex} (parent job ${jobId})`,
    );

    // Download and extract files for this batch, return as array of { name, buffer }
    const files: { name: string; buffer: Buffer }[] = [];
    for (const row of batch) {
      try {
        const downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFiles?trackId=${row['id']}`;
        const extractedFiles = await this.downloadService.downloadAndProcessZip(
          downloadUrl,
          row['Tipo_Consulta'],
          row['date'],
          row['id'],
          axiosInstance, // Pass authenticated instance
        );
        files.push(...extractedFiles);
      } catch (error) {
        console.error(
          `[Child Job] Failed to process document ID ${row['id']}:`,
          error.message,
        );
      }
    }
    return files;
  }
}
