import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

export interface TableDownloadJobData {
  authUrl: string;
  startDate: string;
  endDate: string;
  recibidos: boolean;
  enviados: boolean;
  nit: string;
  jobId: string;
}

@Injectable()
export class ReceivedInvoicesQueue {
  constructor(
    @InjectQueue('received-invoices') private receivedInvoicesQueue: Queue,
  ) {}

  async addJob(data: TableDownloadJobData) {
    return this.receivedInvoicesQueue.add('download', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async getJobStatus(jobId: string) {
    const job = await this.receivedInvoicesQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const error = job.failedReason;

    return {
      id: job.id,
      state,
      progress,
      result,
      error,
    };
  }
}
