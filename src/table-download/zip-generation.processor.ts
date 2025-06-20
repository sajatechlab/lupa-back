import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { DownloadLocalService } from './download-local.service';
import { FlowProducer, Queue, QueueEvents, Worker } from 'bullmq';
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

  @Process('zip-generation')
  async handleZipGeneration(job: Job<ZipJobPayload>): Promise<string> {
    try {
      console.log(`Processing parent job ${job.id}...`);
      const { data } = job;

      // Authenticate with DIAN before calling getRows
      const jar = new CookieJar();
      const axiosInstance = wrapper(
        axios.create({ jar, withCredentials: true }),
      );
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
      console.log(`[Parent Job] Total rows to process: ${allRows.length}`);
      const validFiles = allRows.filter(
        (row) => row['id'] && row['DocTipo'] !== '96',
      );

      // 2. Add a child job for each file (no batching)
      const redisConnection = {
        url: process.env.REDIS_URL,
        maxRetriesPerRequest: null,
      };
      const flowProducer = new FlowProducer({ connection: redisConnection });
      const children = validFiles.map((file, idx) => ({
        name: 'process-file',
        queueName: ZIP_FILE_PROCESSING_QUEUE,
        data: {
          file,
          fileIndex: idx,
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
      console.log(
        `[Parent Job] Flow with children created. Waiting for children to finish...`,
      );

      // 3. Wait for all children to complete using QueueEvents
      const queueEvents = new QueueEvents(ZIP_FILE_PROCESSING_QUEUE, {
        connection: redisConnection,
      });
      await queueEvents.waitUntilReady();

      const childResults: { name: string; buffer: Buffer }[] = [];
      if (Array.isArray(flow.children) && flow.children.length > 0) {
        for (const child of flow.children) {
          const childJobId = child.job.id;
          let result;
          while (true) {
            const childJob = await this.fileQueue.getJob(childJobId);
            if (!childJob) throw new Error(`Child job ${childJobId} not found`);
            const state = await childJob.getState();
            if (state === 'completed') {
              result = await childJob.returnvalue;
              break;
            } else if (state === 'failed') {
              throw new Error(`Child job ${childJobId} failed`);
            }
            await new Promise((res) => setTimeout(res, 500)); // wait 0.5s
          }
          if (Array.isArray(result)) {
            childResults.push(...result);
          } else {
            const fileId = child?.job?.data?.file?.id ?? 'unknown';
            console.error(
              `[Parent Job] Child job ${childJobId} (file id: ${fileId}) returned non-array result:`,
              result,
            );
          }
        }
        await queueEvents.close(); // Clean up
        console.log(
          `[Parent Job] All child jobs finished. Total files: ${childResults.length}`,
        );
      } else {
        await queueEvents.close(); // Clean up
        console.log(`[Parent Job] No child jobs to process.`);
      }

      // 4. Aggregate all files and create the final ZIP
      console.log(`[Parent Job] Creating ZIP...`);
      const hydratedResults = childResults.map((file) => ({
        ...file,
        buffer: Buffer.isBuffer(file.buffer)
          ? file.buffer
          : Buffer.from(
              Array.isArray((file.buffer as any)?.data)
                ? (file.buffer as any).data
                : [],
            ),
      }));
      const zipBuffer = await this.downloadService.createZipFromBuffers(
        hydratedResults,
        job.id.toString(),
      );
      console.log(`[Parent Job] ZIP created. Size: ${zipBuffer.length} bytes`);

      // 5. Upload to Spaces
      const s3Key = `dian-exports/dian-export-${job.id}.zip`;
      console.log(`[Parent Job] Uploading ZIP to cloud storage as ${s3Key}...`);
      await this.attachmentsService.uploadFile(zipBuffer, s3Key);
      console.log(`[Parent Job] Uploaded ${s3Key} to cloud storage.`);

      console.log(`[Parent Job] Returning s3Key: ${s3Key}`);
      return s3Key;
    } catch (err) {
      console.error(`[Parent Job] Error:`, err);
      throw err;
    }
  }
}

// New processor for file processing (no batch)
@Processor(ZIP_FILE_PROCESSING_QUEUE)
export class ZipFileProcessingProcessor {
  constructor(private readonly downloadService: DownloadLocalService) {}

  @Process('process-file')
  async handleFile(
    job: Job<{
      file: Record<string, any>;
      fileIndex: number;
      jobId: string;
      authUrl: string;
      nit: string;
    }>,
  ) {
    const { file, fileIndex, jobId, authUrl, nit } = job.data;
    console.log(
      `[Child Job] Processing file ${fileIndex} for parent job ${jobId}`,
    );

    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError: any;

    while (attempt < MAX_RETRIES) {
      try {
        // Authenticate with DIAN for this file
        const jar = new CookieJar();
        const axiosInstance = wrapper(
          axios.create({ jar, withCredentials: true }),
        );
        const authResponse = await axiosInstance.get(authUrl);
        if (authResponse.status !== 200) {
          throw new Error(
            `Authentication failed with status ${authResponse.status}`,
          );
        }
        console.log(
          `[Child Job] Authenticated for file ${fileIndex} (parent job ${jobId})`,
        );

        // Download and extract file, return as array of { name, buffer }
        const downloadUrl =
          file['DocTipo'] === '05'
            ? `https://catalogo-vpfe.dian.gov.co/Document/GetFilePdf?cune=${file['id']}`
            : file['DocTipo'] === '60'
            ? `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFilesEquivalente?trackId=${file['id']}`
            : file['DocTipo'] === '102'
            ? `https://catalogo-vpfe.dian.gov.co/Document/GetFilesIndividualPayroll?trackId=${file['id']}&token=${file['token']}`
            : `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFiles?trackId=${file['id']}`;
        const extractedFiles = await this.downloadService.downloadAndProcessZip(
          downloadUrl,
          file['Tipo_Consulta'],
          file['date'],
          file['id'],
          axiosInstance, // Pass authenticated instance
        );
        return extractedFiles;
      } catch (error) {
        lastError = error;
        attempt++;
        console.error(
          `[Child Job] Attempt ${attempt} failed for document ID ${file['id']}:`,
          error.message,
          error.code,
          error.config?.url,
        );
        if (attempt < MAX_RETRIES) {
          // Wait before retrying
          await new Promise((res) => setTimeout(res, 1000 * attempt));
        }
      }
    }
    // After all retries failed
    console.error(
      `[Child Job] All ${MAX_RETRIES} attempts failed for document ID ${file['id']}. Last error:`,
      lastError?.message,
    );
    return [];
  }
}
