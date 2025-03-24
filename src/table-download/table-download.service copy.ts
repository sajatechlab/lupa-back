import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import * as AdmZip from 'adm-zip';

@Injectable()
export class TableDownloadService {
  private readonly axiosInstance;

  constructor(private readonly httpService: HttpService) {
    // Initialize Axios with cookie jar support
    const jar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({ jar, withCredentials: true }));
  }

  async authenticateTabulateAndDownload(
    authUrl: string,
    startDate: string,
    endDate: string,
    downloadPath: string,
    recibidos: boolean,
    enviados: boolean,
  ): Promise<{
    tabulatedData: Record<string, any>[];
    downloadedFiles: string[];
    totalSeconds: number;
    avgSecondsPerDoc: number;
  }> {
    console.log('Starting authentication process with:', {
      authUrl,
      startDate,
      endDate,
      downloadPath,
      recibidos,
      enviados,
    });

    const startTime = Date.now();
    const tabulatedData: Record<string, any>[] = [];
    const downloadedFiles: string[] = [];

    try {
      // Step 1: Authentication
      const authResponse = await this.axiosInstance.get(authUrl);
      console.log('Auth response status:', authResponse.status);

      if (authResponse.status !== 200) {
        throw new Error(
          `Authentication failed with status ${authResponse.status}`,
        );
      }

      // Create download directory if it doesn't exist
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }

      // Step 2: Process and download
      if (recibidos) {
        console.log('Processing received documents...');
        await this.processAndDownload(
          'Received',
          tabulatedData,
          downloadedFiles,
          startDate,
          endDate,
          downloadPath,
        );
      }

      if (enviados) {
        console.log('Processing sent documents...');
        await this.processAndDownload(
          'Sent',
          tabulatedData,
          downloadedFiles,
          startDate,
          endDate,
          downloadPath,
        );
      }

      const totalSeconds = (Date.now() - startTime) / 1000;
      const avgSecondsPerDoc =
        downloadedFiles.length > 0 ? totalSeconds / downloadedFiles.length : 0;

      console.log('Process completed successfully', {
        totalDocuments: downloadedFiles.length,
        totalSeconds,
        avgSecondsPerDoc,
      });

      return { tabulatedData, downloadedFiles, totalSeconds, avgSecondsPerDoc };
    } catch (error) {
      console.error('Error in authenticateTabulateAndDownload:', error);
      throw error;
    }
  }

  private async processAndDownload(
    type: string,
    tabulatedData: Record<string, any>[],
    downloadedFiles: string[],
    startDate: string,
    endDate: string,
    downloadPath: string,
  ): Promise<void> {
    try {
      const url = `https://catalogo-vpfe.dian.gov.co/Document/${type}`;
      console.log(`Requesting data from: ${url}`);

      const requestBody = `startDate=${startDate}&endDate=${endDate}`;
      const response = await this.axiosInstance.post(url, requestBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (response.status !== 200) {
        throw new Error(`Failed to fetch data for ${type}: ${response.status}`);
      }

      const htmlContent = response.data;
      console.log('html', htmlContent);

      const filePath = path.join(downloadPath, `tabla_datos_${type}.html`);
      fs.writeFileSync(filePath, htmlContent);
      console.log(`Data saved for ${type} at ${filePath}`);

      const rows = this.tabulateDataFromHtml(htmlContent);
      console.log(`Found ${rows.length} rows to process for ${type}`);

      for (const row of rows) {
        row['Tipo_Consulta'] = type === 'Received' ? 'Recibido' : 'Enviado';
      }

      tabulatedData.push(...rows);
      await this.downloadFiles(rows, downloadPath, downloadedFiles);
    } catch (error) {
      console.error(`Error in processAndDownload for ${type}:`, error);
      throw error;
    }
  }

  private tabulateDataFromHtml(htmlContent: string): Record<string, any>[] {
    let tabulatedData: Record<string, any>[] = [];

    const headers = [
      'Recepcion',
      'Fecha',
      'Prefijo',
      'N_documento',
      'Tipo',
      'NIT Emisor',
      'Emisor',
      'NIT Receptor',
      'Receptor',
      'Resultado',
      'Estado RADIAN',
      'Valor Total',
    ];

    // Extract rows
    const rowMatches = htmlContent.match(/<tr.*?>(.*?)<\/tr>/gs) || [];

    for (const rowMatch of rowMatches) {
      const rowContent = rowMatch.match(/<tr.*?>(.*?)<\/tr>/s)?.[1] || '';

      // Extract trackId (data-id)
      const trackId = rowMatch.match(/data-id="(.*?)"/)?.[1] || null;

      // Extract data-type
      const docTipo = rowMatch.match(/data-type="(.*?)"/)?.[1] || '';

      // Extract cells (td)
      const cellMatches = rowContent.match(/<td.*?>(.*?)<\/td>/gs) || [];
      const cells = cellMatches.map((cell) =>
        cell.replace(/<.*?>/g, '').trim(),
      );

      if (trackId && cells.length > 1) {
        const rowData: Record<string, any> = {
          id: trackId,
        };

        // Add columns in order
        for (let i = 1; i < cells.length && i <= headers.length; i++) {
          rowData[headers[i - 1]] = cells[i];

          // After adding "Recepcion", add "DocTipo"
          if (i === 1) {
            rowData['DocTipo'] = docTipo;
          }
        }

        tabulatedData.push(rowData);
      }
    }

    const validDocTipos = new Set(['96']);

    // Filter using the same logic as .NET
    tabulatedData = tabulatedData.filter((row) => {
      if (!row.hasOwnProperty('DocTipo')) {
        return false;
      }

      const docTipoValue = row['DocTipo']?.toString();

      if (docTipoValue === null || docTipoValue === undefined) {
        return false;
      }

      return !validDocTipos.has(docTipoValue);
    });

    return tabulatedData;
  }

  private async downloadFiles(
    rows: Record<string, any>[],
    downloadPath: string,
    downloadedFiles: string[],
  ) {
    for (const row of rows) {
      const trackId = row['id'];
      if (!trackId) continue;

      const docTipo = row['DocTipo'];
      let downloadUrl: string;

      if (docTipo === '05' || docTipo === '102') {
        downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/GetFilePdf?cune=${trackId}`;
      } else if (docTipo === '60') {
        downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFilesEquivalente?trackId=${trackId}`;
      } else {
        downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFiles?trackId=${trackId}`;
      }

      try {
        const response = await this.axiosInstance.get(downloadUrl, {
          responseType: 'arraybuffer',
        });

        if (response.status === 200) {
          const contentType = response.headers['content-type'];
          const fileExtension = contentType?.includes('pdf') ? 'pdf' : 'zip';

          // Create filename using row data
          const fileName = this.createFileName(row, trackId, fileExtension);
          const filePath = path.join(downloadPath, fileName);

          fs.writeFileSync(filePath, response.data);
          downloadedFiles.push(filePath);

          // Extract ZIP if applicable
          if (fileExtension === 'zip') {
            await this.extractAndClassifyZip(filePath, downloadPath);
          }
        }
      } catch (error) {
        console.error(`Error downloading file for trackId ${trackId}:`, error);
      }
    }
  }

  private createFileName(
    row: Record<string, any>,
    trackId: string,
    extension: string,
  ): string {
    const fecha = row['Fecha'] || '';
    const prefijo = row['Prefijo'] || '';
    const nDocumento = row['N_documento'] || '';
    const tipoConsulta = row['Tipo_Consulta'] || '';
    const docTipo = row['DocTipo'] || '';
    const nit = row['NIT Emisor'] || row['NIT Receptor'] || '';
    const nombre = (row['Emisor'] || row['Receptor'] || '').substring(0, 10);

    const sanitize = (str: string) => str.replace(/[<>:"/\\|?*]+/g, '_');

    return sanitize(
      `${tipoConsulta}-${docTipo}-${fecha}-${prefijo}-${nDocumento}-${nit}-${nombre}-${trackId}.${extension}`,
    );
  }

  private async extractAndClassifyZip(zipPath: string, basePath: string) {
    const pdfFolder = path.join(basePath, 'PDF');
    const xmlFolder = path.join(basePath, 'XML');

    fs.mkdirSync(pdfFolder, { recursive: true });
    fs.mkdirSync(xmlFolder, { recursive: true });

    const baseName = path.basename(zipPath, '.zip');
    const zip = new AdmZip(zipPath);

    zip.getEntries().forEach((entry) => {
      const entryName = entry.entryName.toLowerCase();
      if (entryName.endsWith('.pdf')) {
        zip.extractEntryTo(
          entry,
          pdfFolder,
          false,
          true,
          false,
          `${baseName}.pdf`,
        );
      } else if (entryName.endsWith('.xml')) {
        zip.extractEntryTo(
          entry,
          xmlFolder,
          false,
          true,
          false,
          `${baseName}.xml`,
        );
      }
    });
  }
}
