import { Worker } from 'worker_threads';
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import axios, { all } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar, parse } from 'tough-cookie';
import * as AdmZip from 'adm-zip';
import * as xml2js from 'xml2js';
import * as crypto from 'crypto';
import { Company } from '../company/entities/company.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceLine } from '../invoice/entities/invoice-line.entity';
import { SoftwareProvider } from '../software-provider/entities/software-provider.entity';
import { AttachmentsService } from '../attachments/attachments.service';
import * as path from 'path';
import * as archiver from 'archiver';
import { PassThrough } from 'stream';
import * as fs from 'fs';
import * as os from 'os';

enum InvoiceType {
  RECEIVED = 'RECEIVED',
  SENT = 'SENT',
}

@Injectable()
export class DownloadLocalService {
  private workers: Worker[] = [];
  private workerIndex = 0;
  private readonly MAX_WORKERS = 8; // Adjust based on CPU cores
  private jobStatus: Record<
    string,
    { status: string; documentsFound: number; documentsProcessed: number }
  > = {};
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLine)
    private invoiceLineRepository: Repository<InvoiceLine>,
    @InjectRepository(SoftwareProvider)
    private softwareProviderRepository: Repository<SoftwareProvider>,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  private getYear(dateStr: string): number {
    return parseInt(dateStr.split('-')[0], 10);
  }

  private async downloadFiles(
    rows: Record<string, any>[],
    downloadedFiles: string[],
    axiosInstance: any,
    jobId: string,
  ): Promise<string> {
    console.log(`Rows to process: ${rows.length}`);

    const validFiles = rows.filter(
      (row) => row['id'] && row['DocTipo'] !== '69',
    );
    const BATCH_SIZE = 5;
    let successCount = 0;

    const filesToZip: { name: string; buffer: Buffer }[] = [];

    console.log('Starting to download and collect files for ZIP...');
    for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
      const batch = validFiles.slice(i, i + BATCH_SIZE);

      const downloadPromises = batch.map(async (row) => {
        try {
          const downloadUrl =
            row['DocTipo'] === '05' || row['DocTipo'] === '102'
              ? `https://catalogo-vpfe.dian.gov.co/Document/GetFilePdf?cune=${row['id']}`
              : row['DocTipo'] === '60'
              ? `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFilesEquivalente?trackId=${row['id']}`
              : `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFiles?trackId=${row['id']}`;
          const extractedFiles = await this.downloadAndProcessZip(
            downloadUrl,
            row['Tipo_Consulta'],
            row['date'],
            row['id'],
            row['DocTipo'],
            row['serieNumber'],
            row['thirdPartyNit'],
            row['thirdPartyName'],
            axiosInstance,
          );
          for (const file of extractedFiles) {
            filesToZip.push(file);
          }
          return true;
        } catch (error) {
          console.error(`Failed to process ${row['id']}:`, error);
          return false;
        }
      });

      const results = await Promise.allSettled(downloadPromises);
      successCount += results.filter((r) => r.status === 'fulfilled').length;

      if (i + BATCH_SIZE < validFiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log('All files collected, starting to append to archive...');
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Create a unique path in the OS's temp directory
    const tempDir = path.join(os.tmpdir(), 'zips');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const outPath = path.join(tempDir, `dian-export-${jobId}.zip`);
    const fileStream = fs.createWriteStream(outPath);
    archive.pipe(fileStream);
    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      throw err;
    });
    archive.on('warning', (err) => {
      console.warn('Archiver warning:', err);
    });

    // Debug: check for empty/duplicate files
    const nameSet = new Set();
    for (const file of filesToZip) {
      if (!file.buffer || file.buffer.length === 0) {
        console.error(`Skipping empty file: ${file.name}`);
        continue;
      }
      if (nameSet.has(file.name)) {
        console.error(`Duplicate file name detected: ${file.name}`);
        continue;
      }
      nameSet.add(file.name);
      console.log(
        `Appending file to archive: ${file.name} (${file.buffer.length} bytes)`,
      );
      archive.append(file.buffer, { name: file.name });
    }

    console.log('All files appended, finalizing archive...');
    try {
      await archive.finalize();
      console.log('archive.finalize() returned/resolved');
    } catch (err) {
      console.error('archive.finalize() threw:', err);
      throw err;
    }
    console.log(`Processed ${successCount} out of ${validFiles.length} files.`);

    await Promise.race([
      new Promise<void>((resolve, reject) => {
        fileStream.on('close', () => {
          console.log('File stream closed. Archive written to test-output.zip');
          resolve();
        });
        fileStream.on('error', (err) => {
          console.error('File stream error:', err);
          reject(err);
        });
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => {
          console.error(
            'Archive timeout: file stream did not close in 60 seconds',
          );
          reject(new Error('Archive timeout'));
        }, 60000),
      ),
    ]);

    // Read the file into a buffer and return it
    const zipBuffer = fs.readFileSync(outPath);

    // Define the key/filename for cloud storage
    const s3Key = `dian-exports/dian-export-${jobId}.zip`;

    // Upload to Spaces
    await this.attachmentsService.uploadFile(zipBuffer, s3Key);
    console.log(`Uploaded ${s3Key} to cloud storage.`);

    // Clean up local temp file
    fs.unlinkSync(outPath);
    console.log(`Removed temporary file: ${outPath}`);

    // Return the S3 key
    console.log(`Job ${jobId} finished. Returning S3 key: ${s3Key}`);
    return s3Key;
  }
  private parseDotNetDate(dotNetDate: string): Date | null {
    // Example input: "/Date(1750291200000)/"
    const match = /\/Date\((\d+)\)\//.exec(dotNetDate);
    if (match) {
      const timestamp = parseInt(match[1], 10);
      return new Date(timestamp);
    }
    return null;
  }
  // Update downloadAndProcessZip to return an array of files to zip
  async downloadAndProcessZip(
    url: string,
    type: 'Received' | 'Sent',
    date: string,
    id: string,
    doctType: string,
    serieNumber: string,
    thirdPartyNit: string,
    thirdPartyName: string,
    axiosInstance: any,
  ): Promise<{ name: string; buffer: Buffer }[]> {
    const files: { name: string; buffer: Buffer }[] = [];
    console.log(
      `Downloading ZIP from ${url} for ${type} on date ${date} with ID ${id}`,
    );

    const fullDate = new Date(date);
    const year = String(fullDate.getFullYear()).padStart(4, '0');
    const month = String(fullDate.getMonth() + 1).padStart(2, '0');
    const day = String(fullDate.getDate()).padStart(2, '0');
    const folderType = type === 'Received' ? 'RECIBIDOS' : 'ENVIADOS';

    const response = await axiosInstance.get(url, {
      responseType: 'arraybuffer',
    });

    const originalZipBuffer = Buffer.from(response.data);
    const zip = new AdmZip(originalZipBuffer);
    const zipEntries = zip.getEntries();

    for (const entry of zipEntries) {
      const name = entry.entryName;
      if (
        !entry.isDirectory &&
        (name.endsWith('.pdf') || name.endsWith('.xml'))
      ) {
        const content = entry.getData();
        const fileName = name.split('/').pop();
        files.push({
          name: `luup/${year}/${folderType}/${month}/UNZIP/${doctType}_${day}_${month}_${year}_${serieNumber}_${thirdPartyNit}__${thirdPartyName}`,
          buffer: content,
        });
      }
    }

    files.push({
      name: `luup/${year}/${folderType}/${month}/ZIP/${doctType}_${day}_${month}_${year}_${serieNumber}_${thirdPartyNit}__${thirdPartyName}.zip`,
      buffer: originalZipBuffer,
    });

    return files;
  }

  async generateZipBuffer(
    authUrl: string,
    startDate: string,
    endDate: string,
    recibidos: boolean,
    enviados: boolean,
    nit: string,
    jobId: string,
  ): Promise<string> {
    // Create a new CookieJar and axiosInstance for this job
    const jar = new CookieJar();
    const axiosInstance = wrapper(axios.create({ jar, withCredentials: true }));

    // Step 1: Authenticate (this sets cookies in the jar)
    const authResponse = await axiosInstance.get(authUrl);
    if (authResponse.status !== 200) {
      throw new Error(
        `Authentication failed with status ${authResponse.status}`,
      );
    }

    // Step 2: Gather all rows for both types
    const allRows: Record<string, any>[] = [];
    if (recibidos) {
      const rows = await this.getRows(
        'Received',
        startDate,
        endDate,
        nit,
        axiosInstance,
      );
      allRows.push(...rows);
    }
    if (enviados) {
      const rows = await this.getRows(
        'Sent',
        startDate,
        endDate,
        nit,
        axiosInstance,
      );
      allRows.push(...rows);
    }
    console.log('startDate', startDate);
    console.log('endDate', endDate);

    console.log('allRows', allRows);
    // Step 3: Download files and build ZIP, passing the jobId
    return await this.downloadFiles(allRows, [], axiosInstance, jobId);
  }

  public async getRows(
    type: string,
    startDate: string,
    endDate: string,
    nit: string,
    axiosInstance: any,
  ): Promise<Record<string, any>[]> {
    const url = `https://catalogo-vpfe.dian.gov.co/Document/GetDocumentsPageToken`;
    const sameYear = this.getYear(endDate) === this.getYear(startDate);
    let currentStartDate = sameYear
      ? startDate
      : `${this.getYear(endDate)}-01-01`;
    let currentEndDate = endDate;
    const allRows = [];
    const filterType = type === 'Received' ? '3' : '2';

    const requestBody = {
      draw: 1,
      start: 0,
      length: 50,
      DocumentKey: '',
      SerieAndNumber: '',
      SenderCode: '',
      ReceiverCode: '',
      StartDate: currentStartDate,
      EndDate: currentEndDate,
      DocumentTypeId: '00', // "Todos"
      Status: '0', // "Todos"
      IsNextPage: false,
      FilterType: filterType,
      blockIndex: 0,
    };
    const response = await axiosInstance.post(url, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status !== 200 || !response.data || !response.data.data) {
      return [];
    }
    allRows.push(
      ...response.data.data.map((row) => ({
        id: row.Id,
        Tipo_Consulta: type,
        DocTipo: row.DocumentTypeId,
        date: this.parseDotNetDate(row.EmissionDate),
        token: row.TokenConsulta,
        serieNumber: row.SerieAndNumber,
        thirdPartyNit: type === 'Received' ? row.SenderCode : row.ReceiverCode,
        thirdPartyName: (type === 'Received'
          ? row.SenderName
          : row.ReceiverName
        )?.slice(0, 20),
      })),
    );

    const rowsQuantity = response.data.recordsTotal;

    const pages = Math.ceil(rowsQuantity / 50);
    console.log(
      `Total rows found for ${type}: ${rowsQuantity} - Total pages for ${type}: ${pages}`,
    );

    if (pages > 1) {
      const pagePromises = [];
      for (let i = 2; i <= pages; i++) {
        const start = ((i - 1) % 3) * 50;
        const blockIndex = Math.floor((i - 1) / 3);
        const IsNextPage = i >= 4;
        const requestBody = {
          draw: i,
          start,
          length: 50,
          DocumentKey: '',
          SerieAndNumber: '',
          SenderCode: '',
          ReceiverCode: '',
          StartDate: currentStartDate,
          EndDate: currentEndDate,
          DocumentTypeId: '00', // "Todos"
          Status: '0', // "Todos"
          IsNextPage,
          FilterType: filterType,
          blockIndex,
        };

        pagePromises.push(
          axiosInstance.post(url, requestBody, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }),
        );
      }

      const settledResults = await Promise.allSettled(pagePromises);

      for (const result of settledResults) {
        if (result.status === 'fulfilled') {
          const response = result.value;
          allRows.push(
            ...response.data.data.map((row) => ({
              id: row.Id,
              Tipo_Consulta: type,
              DocTipo: row.DocumentTypeId,
              date: this.parseDotNetDate(row.EmissionDate),
              token: row.TokenConsulta,
              serieNumber: row.SerieAndNumber,
              thirdPartyNit:
                type === 'Received' ? row.SenderCode : row.ReceiverCode,
              thirdPartyName: (type === 'Received'
                ? row.SenderName
                : row.ReceiverName
              )?.slice(0, 20),
            })),
          );
        }
      }
    }
    return allRows;
  }

  public async createZipFromBuffers(
    files: { name: string; buffer: Buffer }[],
    jobId: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const buffers: Buffer[] = [];
      archive.on('data', (chunk) => buffers.push(chunk));
      archive.on('error', (err) => reject(err));
      archive.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      for (const file of files) {
        archive.append(file.buffer, { name: file.name });
      }
      archive.finalize();
    });
  }
}
