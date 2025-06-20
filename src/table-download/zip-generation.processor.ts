import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { DownloadLocalService } from './download-local.service';
import * as fs from 'fs';
import * as path from 'path';

export const ZIP_GENERATION_QUEUE = 'zip-generation';

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
  constructor(private readonly downloadService: DownloadLocalService) {}

  @Process()
  async handleZipGeneration(job: Job<ZipJobPayload>): Promise<string> {
    console.log(`Processing job ${job.id}...`);
    const { data } = job;

    try {
      // The service will now return the *path* to the generated file
      const zipFilePath = await this.downloadService.generateZipBuffer(
        data.authUrl,
        data.startDate,
        data.endDate,
        data.recibidos,
        data.enviados,
        data.nit,
        job.id.toString(), // Pass job ID to create a unique filename
      );

      console.log(`Job ${job.id} completed. ZIP saved at ${zipFilePath}`);

      // Return the path to the generated file, which Bull will save on the completed job object
      return zipFilePath;
    } catch (error) {
      console.error(`Job ${job.id} failed`, error);
      // Let Bull know the job failed
      throw error;
    }
  }
}
