import { Worker } from 'worker_threads';
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as AdmZip from 'adm-zip';
import * as xml2js from 'xml2js';
import * as crypto from 'crypto';
import { Company } from '../company/entities/company.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceLine } from '../invoice/entities/invoice-line.entity';
import { SoftwareProvider } from '../software-provider/entities/software-provider.entity';
import { AttachmentsService } from 'src/attachments/attachments.service';
import * as path from 'path';
import { log } from 'console';

enum InvoiceType {
  RECEIVED = 'RECEIVED',
  SENT = 'SENT',
}

@Injectable()
export class TableDownloadService {
  private readonly axiosInstance;
  private workers: Worker[] = [];
  private workerIndex = 0;
  private readonly MAX_WORKERS = 8; // Adjust based on CPU cores
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
  ) {
    // Initialize Axios with cookie jar support
    const jar = new CookieJar();
    this.axiosInstance = wrapper(axios.create({ jar, withCredentials: true }));

    // Initialize worker pool
    for (let i = 0; i < this.MAX_WORKERS; i++) {
      const worker = new Worker(path.resolve(__dirname, 'xml.worker.js'));
      this.workers.push(worker);
    }
  }

  private getNextWorker(): Worker {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.MAX_WORKERS;
    return worker;
  }

  private parseXmlWithWorker(
    xmlContent: string,
    type: 'Received' | 'Sent',
    fileName: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = this.getNextWorker();

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Worker timeout'));
      }, 30000);

      // Define message handler
      const messageHandler = (result: any) => {
        cleanup();
        if (result.success) {
          resolve(result.data);
        } else {
          reject(new Error(result.error));
        }
      };

      // Define error handler
      const errorHandler = (error: Error) => {
        cleanup();
        reject(error);
      };

      // Cleanup function to remove listeners
      const cleanup = () => {
        clearTimeout(timeoutId);
        worker.removeListener('message', messageHandler);
        worker.removeListener('error', errorHandler);
      };

      // Add listeners
      worker.once('message', messageHandler);
      worker.once('error', errorHandler);

      // Send the message
      worker.postMessage({ xmlContent, type, fileName });
    });
  }

  async authenticateTabulateAndDownload(
    authUrl: string,
    startDate: string,
    endDate: string,
    recibidos: boolean,
    enviados: boolean,
    nit: string,
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
      recibidos,
      enviados,
      nit,
    });
    console.log('startTime', Date.now());

    const startTime = Date.now();
    const tabulatedData: Record<string, any>[] = [];
    const downloadedFiles: string[] = [];

    try {
      // Step 1: Authentication
      const authResponse = await this.axiosInstance.get(authUrl);
      if (authResponse.status !== 200) {
        throw new Error(
          `Authentication failed with status ${authResponse.status}`,
        );
      }

      // Step 2: Process both types in parallel
      const processPromises = [];
      if (recibidos) {
        console.log('Processing received documents...');
        processPromises.push(
          this.processAndDownload(
            'Received',
            tabulatedData,
            downloadedFiles,
            startDate,
            endDate,
            nit,
          ),
        );
      }

      if (enviados) {
        console.log('Processing sent documents...');
        processPromises.push(
          this.processAndDownload(
            'Sent',
            tabulatedData,
            downloadedFiles,
            startDate,
            endDate,
            nit,
          ),
        );
      }

      // Wait for both processes to complete
      await Promise.all(processPromises);

      const totalSeconds = (Date.now() - startTime) / 1000;
      const avgSecondsPerDoc =
        downloadedFiles.length > 0 ? totalSeconds / downloadedFiles.length : 0;

      console.log('difference in minutes', (Date.now() - startTime) / 60000);
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
    nit: string,
  ): Promise<void> {
    try {
      const url = `https://catalogo-vpfe.dian.gov.co/Document/${type}`;
      console.log(`Processing data from: ${url}`);

      let currentStartDate = `${this.getYear(endDate)}-01-01`;
      let currentEndDate = endDate;
      let hasMoreData = true;

      while (hasMoreData) {
        console.log(
          `Requesting period: ${currentStartDate} to ${currentEndDate}`,
        );

        const requestBody = `startDate=${currentStartDate}&endDate=${currentEndDate}&documentTypeId=01`;
        const response = await this.axiosInstance.post(url, requestBody, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (response.status !== 200) {
          throw new Error(
            `Failed to fetch data for ${type}: ${response.status}`,
          );
        }

        const htmlContent = response.data;

        const rows = this.tabulateDataFromHtml(htmlContent, type, nit);

        console.log(`Found ${rows.length} rows`);

        // Add type to each row
        rows.forEach((row) => (row['Tipo_Consulta'] = type));

        // Add to our results
        tabulatedData.push(...rows);
        await this.downloadFiles(rows, downloadedFiles);

        if (rows.length === 150) {
          // Get the date from the last row
          const lastRow = rows[rows.length - 1];
          const lastRowDate = this.getDateFromRow(lastRow);
          console.log('lastRowDate', lastRowDate);

          // Set the new end date to the last row's date
          currentEndDate = lastRowDate;

          // If we're still in the same year, continue
          if (this.getYear(currentEndDate) === this.getYear(currentStartDate)) {
            hasMoreData = true;
          } else {
            // If we've crossed a year boundary, adjust the date range
            currentEndDate = `${this.getYear(currentStartDate)}-12-31`; // End of current year
            hasMoreData = true;
          }
        } else {
          // If we got less than 150 rows
          if (this.getYear(startDate) < this.getYear(currentEndDate)) {
            // Move to next year
            console.log('moving to next year');
            const previousYear = this.getYear(currentEndDate) - 1;
            currentEndDate = `${previousYear}-12-31`;
            currentStartDate = `${previousYear}-01-01`;
            hasMoreData = true;
          } else {
            hasMoreData = false;
          }
        }

        // Add a small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error in processAndDownload for ${type}:`, error);
      throw error;
    }
  }

  private getDateFromRow(row: any): string {
    try {
      const date = row.fecha || row.date || row['Fecha'];
      if (!date) {
        throw new Error('Date not found in row');
      }

      // Convert from DD-MM-YYYY to YYYY-MM-DD
      const [day, month, year] = date.split('-');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error extracting date from row:', error);
      console.error('Row data:', row);
      throw error;
    }
  }

  private getYear(dateStr: string): number {
    console.log('dateStr', dateStr);
    console.log('type of', typeof dateStr);
    console.log('split', dateStr.split('-'));
    console.log('split[2]', dateStr.split('-')[0]);
    console.log('parseInt', parseInt(dateStr.split('-')[0], 10));

    return parseInt(dateStr.split('-')[0], 10);
  }

  private tabulateDataFromHtml(
    htmlContent: string,
    type: string,
    nit: string,
  ): Record<string, any>[] {
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
    // console.log('tabulatedData', tabulatedData);

    // const validDocTipos = new Set(['96']);

    // Filter using the same logic as .NET
    // tabulatedData = tabulatedData.filter((row) => {
    //   console.log('row', row);

    //   if (!row.hasOwnProperty('DocTipo')) {
    //     return false;
    //   }

    //   const docTipoValue = row['DocTipo']?.toString();

    //   if (docTipoValue === null || docTipoValue === undefined) {
    //     return false;
    //   }

    //   return true; // !validDocTipos.has(docTipoValue);
    // });
    //console.log('tabulatedData', tabulatedData);

    return tabulatedData;
  }

  private async downloadFiles(
    rows: Record<string, any>[],
    downloadedFiles: string[],
  ) {
    // Filter valid files first
    const validFiles = rows.filter(
      (row) => row['id'] && row['DocTipo'] === '01',
    );
    console.log(`Starting to process ${validFiles.length} files in parallel`);

    // Process in batches to avoid overwhelming the server
    const BATCH_SIZE = 5;
    let successCount = 0;

    for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
      const batch = validFiles.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}, files ${
          i + 1
        }-${Math.min(i + BATCH_SIZE, validFiles.length)}`,
      );

      const downloadPromises = batch.map(async (row) => {
        try {
          const downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFiles?trackId=${row['id']}`;
          await this.downloadAndProcessZip(downloadUrl, row['Tipo_Consulta']);
          console.log(`Successfully processed ${row['id']}`);
          return true;
        } catch (error) {
          console.error(`Failed to process ${row['id']}:`, error);
          return false;
        }
      });

      // Process batch in parallel
      const results = await Promise.all(downloadPromises);
      successCount += results.filter((success) => success).length;

      // Small delay between batches to maintain session stability
      if (i + BATCH_SIZE < validFiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `Successfully processed ${successCount} out of ${validFiles.length} files`,
    );
    return successCount;
  }

  async downloadAndProcessZip(
    url: string,
    type: 'Received' | 'Sent',
  ): Promise<void> {
    try {
      const response = await this.axiosInstance.get(url, {
        responseType: 'arraybuffer',
      });
      const zip = new AdmZip(response.data);

      const zipEntries = zip.getEntries();
      const processPromises = zipEntries.map(async (entry) => {
        try {
          const fileBuffer = entry.getData();
          const fileName = entry.entryName.split('.')[0];
          const pdfFileName = `${fileName}.pdf`;

          if (entry.entryName.endsWith('.pdf')) {
            return this.attachmentsService.uploadFile(fileBuffer, pdfFileName);
          }
          if (entry.entryName.endsWith('.xml')) {
            const xmlContent = entry.getData().toString('utf8');
            return this.parseAndSaveXml(xmlContent, type, pdfFileName);
          }
        } catch (error) {
          console.error(`Error processing ${entry.entryName}:`, error);
        }
      });

      await Promise.all(processPromises);
    } catch (error) {
      console.error('Error downloading or processing ZIP:', error);
    }
  }

  private async parseAndSaveXml(
    xmlContent: string,
    type: 'Received' | 'Sent',
    fileName: string,
  ): Promise<void> {
    try {
      const { result } = await this.parseXmlWithWorker(
        xmlContent,
        type,
        fileName,
      );

      const [thirdParty, company] =
        type === 'Received'
          ? [this.createSupplier(result), this.createCustomer(result)]
          : [this.createCustomer(result), this.createSupplier(result)];

      // Process in parallel
      const [thirdPartyData, companyData, softwareProviderData] =
        await Promise.all([
          this.upsertCompany(thirdParty),
          this.upsertCompany(company),
          this.upsertSoftwareProvider(result),
        ]);

      await this.upsertInvoice(
        result,
        companyData,
        thirdPartyData,
        type,
        fileName,
      );
    } catch (error) {
      console.error('Error parsing XML:', error);
      throw error;
    }
  }

  private async upsertCompany(company: Partial<Company>) {
    try {
      // Use upsert to either insert new or update existing company
      await this.companyRepository
        .createQueryBuilder()
        .insert()
        .into(Company)
        .values(company)
        .orUpdate(
          Object.keys(company).filter((key) => key !== 'id'), // update all fields except id
          ['nit'], // unique identifier
          { skipUpdateIfNoValuesChanged: true }, // optimization to skip unnecessary updates
        )
        .execute();

      // Return the company (either existing or newly created)
      return await this.companyRepository.findOne({
        where: { nit: company.nit },
      });
    } catch (error) {
      console.error('Error in upsertCompany:', error);
      throw error;
    }
  }

  private async upsertInvoice(
    result: any,
    companyData: any,
    thirdPartyData: any,
    type: 'Received' | 'Sent',
    fileName: string,
  ) {
    // Create Invoice Data
    const invoiceData = this.createInvoice(
      result,
      companyData,
      thirdPartyData,
      type,
      fileName,
    );

    // Check if invoice exists
    const existingInvoice = await this.invoiceRepository.exist({
      where: { uuid: invoiceData.uuid },
    });

    if (existingInvoice) return; // Do nothing if invoice exists

    // Save New Invoice
    await this.invoiceRepository.save(invoiceData);

    // Create and Save Invoice Lines
    const invoiceLines = this.createInvoiceLines(result);
    if (invoiceLines.length > 0) {
      await this.invoiceLineRepository.save(invoiceLines);
    }
  }

  private async upsertSoftwareProvider(result: any) {
    // Create or update Software Provider
    const softwareProviderData = {
      id: crypto.randomUUID(),
      nit:
        result['ext:UBLExtensions']?.['ext:UBLExtension']?.[0]?.[
          'ext:ExtensionContent'
        ]?.['sts:DianExtensions']?.['sts:SoftwareProvider']?.['sts:ProviderID']
          ._ || '',
    };

    await this.softwareProviderRepository
      .createQueryBuilder()
      .insert()
      .into('software_provider')
      .values(softwareProviderData)
      .orIgnore()
      .execute();
  }

  private createSupplier(result: any) {
    return {
      id: crypto.randomUUID(),
      additionalAccountID:
        result['cac:AccountingSupplierParty']?.['cbc:AdditionalAccountID']?._ ||
        '',
      industryClassificationCode:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cbc:IndustryClassificationCode'
        ]?._,
      physicalLocationID:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PhysicalLocation'
        ]?.['cac:Address']?.['cbc:ID']?._,
      countrySubentityCode:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PhysicalLocation'
        ]?.['cac:Address']?.['cbc:CountrySubentityCode']?._,
      line: result['cac:AccountingSupplierParty']?.['cac:Party']?.[
        'cac:PhysicalLocation'
      ]?.['cac:Address']?.['cac:AddressLine']?.['cbc:Line']?._,
      registrationName:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:RegistrationName']?._,
      taxLevelCode:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:TaxLevelCode']?._,
      taxSchemeID:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cac:TaxScheme']?.['cbc:ID']?._,
      taxSchemeName:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cac:TaxScheme']?.['cbc:Name']?._,
      companyID:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']?._,
      companyIDSchemeID:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']?.['@_schemeID'],
      companyIDSchemeName:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']?.['@_schemeName'],
      companyIDSchemeAgencyID:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']?.['@_schemeAgencyID'],
      contactName:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.['cac:Contact']?.[
          'cbc:Name'
        ]?._,
      contactTelephone:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.['cac:Contact']?.[
          'cbc:Telephone'
        ]?._,
      contactElectronicMail:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.['cac:Contact']?.[
          'cbc:ElectronicMail'
        ]?._,
      nit:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']?._ || '',
      name:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:RegistrationName']?._ || '',
    };
  }

  private createCustomer(result: any) {
    return {
      id: crypto.randomUUID(),
      additionalAccountID:
        result['cac:AccountingCustomerParty']?.['cbc:AdditionalAccountID']?._ ||
        '',
      industryClassificationCode:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cbc:IndustryClassificationCode'
        ]?._,
      physicalLocationID:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PhysicalLocation'
        ]?.['cac:Address']?.['cbc:ID']?._,
      countrySubentityCode:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PhysicalLocation'
        ]?.['cac:Address']?.['cbc:CountrySubentityCode']?._,
      line: result['cac:AccountingCustomerParty']?.['cac:Party']?.[
        'cac:PhysicalLocation'
      ]?.['cac:Address']?.['cac:AddressLine']?.['cbc:Line']?._,
      registrationName:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:RegistrationName']?._,
      taxLevelCode:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:TaxLevelCode']?._,
      taxSchemeID:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cac:TaxScheme']?.['cbc:ID']?._,
      taxSchemeName:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cac:TaxScheme']?.['cbc:Name']?._,
      companyID:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']?._,
      companyIDSchemeID:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']?.['@_schemeID'],
      companyIDSchemeName:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']?.['@_schemeName'],
      companyIDSchemeAgencyID:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']?.['@_schemeAgencyID'],
      contactName:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.['cac:Contact']?.[
          'cbc:Name'
        ]?._,
      contactTelephone:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.['cac:Contact']?.[
          'cbc:Telephone'
        ]?._,
      contactElectronicMail:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.['cac:Contact']?.[
          'cbc:ElectronicMail'
        ]?._,
      nit:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']?._ || '',
      name:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:RegistrationName']?._ || '',
    };
  }

  private createInvoice(
    result: any,
    company: Company,
    thirdParty: Company,
    type: 'Received' | 'Sent',
    fileName: string,
  ) {
    // Helper function to safely get value from nested structure
    const getNestedValue = (obj: any, key: string) => {
      if (!obj) return null;
      const nsKey = `cbc:${key}`;
      const nsValue = obj[nsKey];
      const value = obj[key];
      const target = nsValue || value;
      if (!target) return null;
      if (typeof target === 'object') {
        return target._ || target.__text;
      }
      return target;
    };

    // Helper function to get attribute from nested structure
    const getAttribute = (obj: any, key: string, attr: string) => {
      if (!obj) return null;
      const nsKey = `cbc:${key}`;
      const nsValue = obj[nsKey];
      const value = obj[key];
      const target = nsValue || value;
      if (!target || !target.$) return null;
      return (
        target.$[attr]?.value || target.$[`@_${attr}`] || target[`@_${attr}`]
      );
    };

    // Helper function to safely parse float values
    const parseFloatSafe = (value: any) => {
      if (!value) return 0;
      const numStr =
        typeof value === 'object' ? value._ || value.__text : value;
      return isNaN(parseFloat(numStr)) ? 0 : parseFloat(numStr);
    };

    return {
      uuid: getNestedValue(result, 'UUID'),
      invoiceNumber: getNestedValue(result, 'ID'),
      companyId: company.id,
      thirdPartyId: thirdParty.id,
      type: type === 'Received' ? InvoiceType.RECEIVED : InvoiceType.SENT,
      issueDate: new Date(getNestedValue(result, 'IssueDate')),
      issueTime: new Date(
        `1970-01-01T${getNestedValue(result, 'IssueTime') || '00:00:00'}`,
      ),
      dueDate: getNestedValue(result, 'DueDate')
        ? new Date(getNestedValue(result, 'DueDate'))
        : new Date(getNestedValue(result, 'IssueDate')),
      invoiceTypeCode: getNestedValue(result, 'InvoiceTypeCode') || '',
      note: getNestedValue(result, 'Note'),
      documentCurrencyCode:
        getNestedValue(result, 'DocumentCurrencyCode') || '',
      invoiceAllowanceChargeMultiplierFactorNumeric: getNestedValue(
        result['cac:AllowanceCharge'],
        'MultiplierFactorNumeric',
      ),
      invoiceAllowanceChargeAmount: parseFloatSafe(
        result['cac:AllowanceCharge']?.['cbc:Amount'],
      ),
      invoiceAllowanceChargeAmountCurrencyID: getAttribute(
        result['cac:AllowanceCharge'],
        'Amount',
        'currencyID',
      ),
      invoiceAllowanceChargeBaseAmount: parseFloatSafe(
        result['cac:AllowanceCharge']?.['cbc:BaseAmount'],
      ),
      invoiceAllowanceChargeBaseAmountCurrencyID: getAttribute(
        result['cac:AllowanceCharge'],
        'BaseAmount',
        'currencyID',
      ),
      invoiceTaxTotalTaxAmount: parseFloatSafe(
        result['cac:TaxTotal']?.['cbc:TaxAmount'],
      ),
      invoiceTaxTotalTaxAmountCurrencyID: getAttribute(
        result['cac:TaxTotal'],
        'TaxAmount',
        'currencyID',
      ),
      invoiceWithholdingTaxTotalTaxAmount: parseFloatSafe(
        result['cac:WithholdingTaxTotal']?.['cbc:TaxAmount'],
      ),
      invoiceWithholdingTaxTotalTaxAmountCurrencyID: getAttribute(
        result['cac:WithholdingTaxTotal'],
        'TaxAmount',
        'currencyID',
      ),
      invoiceLineExtensionAmount: parseFloatSafe(
        result['cac:LegalMonetaryTotal']?.['cbc:LineExtensionAmount'],
      ),
      invoiceTaxExclusiveAmount: parseFloatSafe(
        result['cac:LegalMonetaryTotal']?.['cbc:TaxExclusiveAmount'],
      ),
      invoiceTaxInclusiveAmount: parseFloatSafe(
        result['cac:LegalMonetaryTotal']?.['cbc:TaxInclusiveAmount'],
      ),
      invoiceAllowanceTotalAmount: parseFloatSafe(
        result['cac:LegalMonetaryTotal']?.['cbc:AllowanceTotalAmount'],
      ),
      invoiceChargeTotalAmount: parseFloatSafe(
        result['cac:LegalMonetaryTotal']?.['cbc:ChargeTotalAmount'],
      ),
      invoicePayableAmount: parseFloatSafe(
        result['cac:LegalMonetaryTotal']?.['cbc:PayableAmount'],
      ),
      fileName,
    };
  }

  private createInvoiceLines(result: any) {
    // First check if InvoiceLine exists in the result
    const invoiceLines = result['cac:InvoiceLine'] || result['InvoiceLine'];
    if (!invoiceLines) {
      console.log('No invoice lines found in result:', result);
      return [];
    }

    if (!Array.isArray(invoiceLines)) {
      console.log('Processing single invoice line');
      return [
        this.processInvoiceLine(
          invoiceLines,
          this.getNestedValue(result, 'UUID'),
        ),
      ];
    }

    console.log('Processing multiple invoice lines');
    return invoiceLines.map((line: any) =>
      this.processInvoiceLine(line, this.getNestedValue(result, 'UUID')),
    );
  }

  private processInvoiceLine(line: any, invoiceUuid: string) {
    if (!line) {
      console.log('Empty line received');
      return null;
    }

    // Helper function to safely get value from nested structure
    const getNestedValue = (obj: any, key: string) => {
      if (!obj) return null;
      const nsKey = `cbc:${key}`;
      const nsValue = obj[nsKey];
      const value = obj[key];
      const target = nsValue || value;
      if (!target) return null;
      if (typeof target === 'object') {
        return target._ || target['#text'];
      }
      return target;
    };

    // Helper function to get attribute from nested structure
    const getAttribute = (obj: any, key: string, attr: string) => {
      if (!obj) return null;
      const nsKey = `cbc:${key}`;
      const nsValue = obj[nsKey];
      const value = obj[key];
      const target = nsValue || value;
      if (!target || !target.$) return null;
      return (
        target.$[attr]?.value || target.$[`@_${attr}`] || target[`@_${attr}`]
      );
    };

    // Helper function to safely parse float values
    const parseFloatSafe = (value: any) => {
      if (!value) return 0;
      const numStr =
        typeof value === 'object' ? value._ || value.__text : value;
      return isNaN(parseFloat(numStr)) ? 0 : parseFloat(numStr);
    };

    // Process note
    const note = getNestedValue(line, 'Note');

    // Get values from the line object
    const lineID = getNestedValue(line, 'ID');
    const quantity = parseFloatSafe(line['cbc:InvoicedQuantity']);
    const unitCode = getAttribute(line, 'InvoicedQuantity', 'unitCode');
    const lineExtensionAmount = parseFloatSafe(line['cbc:LineExtensionAmount']);
    const currencyID = getAttribute(line, 'LineExtensionAmount', 'currencyID');

    // Get item description
    const itemDescription = getNestedValue(line['cac:Item'], 'Description');

    // Get standard item identification
    const standardItem = line['cac:Item']?.['cac:StandardItemIdentification'];
    const standardItemID = getNestedValue(standardItem, 'ID');
    const standardItemSchemeID = getAttribute(standardItem, 'ID', 'schemeID');

    // Get tax information
    const taxTotal = line['cac:TaxTotal'];
    const taxAmount = parseFloatSafe(taxTotal?.['cbc:TaxAmount']);
    const taxAmountCurrencyID = getAttribute(
      taxTotal,
      'TaxAmount',
      'currencyID',
    );

    // Get tax subtotal information
    const taxSubtotal = taxTotal?.['cac:TaxSubtotal'];
    const taxableAmount = parseFloatSafe(taxSubtotal?.['cbc:TaxableAmount']);
    const taxableAmountCurrencyID = getAttribute(
      taxSubtotal,
      'TaxableAmount',
      'currencyID',
    );

    // Get tax category information
    const taxCategory = taxSubtotal?.['cac:TaxCategory'];
    const taxPercent = parseFloatSafe(taxCategory?.['cbc:Percent']);

    // Get tax scheme information
    const taxScheme = taxCategory?.['cac:TaxScheme'];
    const taxSchemeID = getNestedValue(taxScheme, 'ID');
    const taxSchemeName = getNestedValue(taxScheme, 'Name');

    // Get price information
    const price = line['cac:Price'];
    const priceAmount = parseFloatSafe(price?.['cbc:PriceAmount']);
    const priceAmountCurrencyID = getAttribute(
      price,
      'PriceAmount',
      'currencyID',
    );
    const baseQuantity = parseFloatSafe(price?.['cbc:BaseQuantity']);
    const baseQuantityUnitCode = getAttribute(
      price,
      'BaseQuantity',
      'unitCode',
    );

    return {
      id: crypto.randomUUID(),
      invoiceId: invoiceUuid,
      lineID,
      itemDescription,
      quantity,
      note,
      invoicedQuantityUnitCode: unitCode,
      lineExtensionAmount,
      lineExtensionAmountCurrencyID: currencyID,
      standardItemID,
      standardItemSchemeID,
      taxTotalAmount: taxAmount,
      taxTotalAmountCurrencyID: taxAmountCurrencyID,
      taxableAmount,
      taxableAmountCurrencyID: taxableAmountCurrencyID,
      taxAmount,
      taxAmountCurrencyID: taxAmountCurrencyID,
      taxPercent,
      taxSchemeID,
      taxSchemeName,
      priceAmount,
      priceAmountCurrencyID,
      baseQuantity,
      baseQuantityUnitCode,
    };
  }

  // Add these helper methods at the class level
  private getNestedValue(obj: any, key: string) {
    if (!obj) return null;
    const nsKey = `cbc:${key}`;
    const nsValue = obj[nsKey];
    const value = obj[key];
    const target = nsValue || value;
    if (!target) return null;
    if (typeof target === 'object') {
      return target._ || target['#text'];
    }
    return target;
  }

  // Clean up workers when service is destroyed
  async onApplicationShutdown() {
    await Promise.all(
      this.workers.map(
        (worker) =>
          new Promise<void>((resolve) => {
            worker.once('exit', () => resolve());
            worker.terminate();
          }),
      ),
    );
  }
}
