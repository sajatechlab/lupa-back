import { Worker } from 'worker_threads';
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import axios, { all } from 'axios';
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
    jobId: string,
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
    this.jobStatus[jobId] = {
      status: 'in-progress',
      documentsFound: 0,
      documentsProcessed: 0,
    };
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

      if (recibidos) {
        console.log('Processing received documents...');

        this.processAndDownload(
          'Received',
          tabulatedData,
          downloadedFiles,
          startDate,
          endDate,
          nit,
          jobId,
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
          nit,
          jobId,
        );
      }

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
    jobId: string,
  ): Promise<void> {
    try {
      const url = `https://catalogo-vpfe.dian.gov.co/Document/GetDocumentsPageToken`;
      //console.log(`Processing data from: ${url}`);
      const sameYear = this.getYear(endDate) === this.getYear(startDate);
      let currentStartDate = sameYear
        ? startDate
        : `${this.getYear(endDate)}-01-01`;
      let currentEndDate = endDate;
      let hasMoreData = true;
      const allRows = [];
      const pagePromises = [];

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
        DocumentTypeId: '01', // "Todos"
        Status: '0', // "Todos"
        IsNextPage: false,
        FilterType: filterType,
        blockIndex: 0,
      };
      const response = await this.axiosInstance.post(url, requestBody, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('response', response.data);

      if (response.status !== 200) {
        throw new Error(`Failed to fetch data for ${type}: ${response.status}`);
      }

      allRows.push(
        ...response.data.data.map((row) => {
          return {
            id: row.Id,
            Tipo_Consulta: type,
            DocTipo: row.DocumentTypeId,
          };
        }),
      );

      const rowsQuantity = response.data.recordsTotal;
      const pages = Math.ceil(rowsQuantity / 50);

      if (pages > 1) {
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
            DocumentTypeId: '01', // "Todos"
            Status: '0', // "Todos"
            IsNextPage,
            FilterType: filterType,
            blockIndex,
          };

          const promise = await this.axiosInstance.post(url, requestBody, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          pagePromises.push(promise);
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
              })),
            );
          } else {
            console.error('Error fetching page:', result.reason);
            // optionally: log, retry, or skip
          }
        }
      }
      console.log(
        `Found ${allRows.length} documents for ${type},recordsTotal fro period: ${startDate} to ${endDate} is ${rowsQuantity}`,
      );

      this.jobStatus[jobId].documentsFound += allRows.length;
      await this.downloadFiles(allRows, downloadedFiles, jobId);
      this.jobStatus[jobId].status = 'completed';
    } catch (error) {
      console.error(`Error in processAndDownload for ${type}:`, error);
      throw error;
    }
  }

  private getYear(dateStr: string): number {
    return parseInt(dateStr.split('-')[0], 10);
  }

  private async downloadFiles(
    rows: Record<string, any>[],
    downloadedFiles: string[],
    jobId: string,
  ) {
    // Filter valid files first
    const validFiles = rows.filter(
      (row) => row['id'] && row['DocTipo'] === '01',
    );
    //console.log('validFiles', validFiles);

    //console.log(`Starting to process ${validFiles.length} files in parallel`);

    // Process in batches to avoid overwhelming the server
    const BATCH_SIZE = 5;
    let successCount = 0;
    for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
      const failedIds = [];
      const batch = validFiles.slice(i, i + BATCH_SIZE);

      const downloadPromises = batch.map(async (row) => {
        try {
          const downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFiles?trackId=${row['id']}`;
          await this.downloadAndProcessZip(downloadUrl, row['Tipo_Consulta']);
          this.jobStatus[jobId].documentsProcessed += 1;
          console.log(`Successfully processed ${row['id']}`);
          return true;
        } catch (error) {
          console.error(`Failed to process ${row['id']}:`);
          failedIds.push({ id: row['id'], type: row['Tipo_Consulta'] });
          return false;
        }
      });

      // Process batch in parallel
      const results = await Promise.allSettled(downloadPromises);

      // Count the number of successful promises
      const successCountInBatch = results.filter(
        (result) => result.status === 'fulfilled',
      ).length;

      if (failedIds.length > 0) {
        const ids = failedIds.map((row) => row.id);
        console.log(`Retrying failed IDs: ${ids.join(', ')}`);

        // Retry logic for failed IDs
        const retryPromises = failedIds.map(async (row) => {
          try {
            const downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFiles?trackId=${row.id}`;
            await this.downloadAndProcessZip(downloadUrl, row.type);
            this.jobStatus[jobId].documentsProcessed += 1;
            console.log(`Successfully retried and processed ${row.id}`);
          } catch (error) {
            console.error(`Failed to retry processing ${row.id}:`, error);
            // Optionally, you can keep track of failed retries if needed
          }
        });

        // Wait for all retry promises to settle
        await Promise.allSettled(retryPromises);
      }
      // If you want to accumulate successCount
      successCount += successCountInBatch;

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

      await Promise.allSettled(processPromises);
    } catch (error) {
      console.error('Error downloading or processing ZIP:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data?.toString?.() || error.response?.data,
        headers: error.response?.headers,
        stack: error.stack,
      });
      throw new Error(
        `Failed to download or process ZIP file: ${error.message}`,
      );
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
      //console.log('Parsed XML result:', result);

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
    //console.log('result', result);

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

    // Helper function to get deeply nested DIAN values
    const getDianValue = () => {
      try {
        const prefix =
          result['ext:UBLExtensions']?.['ext:UBLExtension'][0]?.[
            'ext:ExtensionContent'
          ]?.['sts:DianExtensions']?.['sts:InvoiceControl']?.[
            'sts:AuthorizedInvoices'
          ]?.['sts:Prefix']?._; // Access the actual value using ._

        return prefix || '';
      } catch (error) {
        console.error('Error getting prefix:', error);
        return '';
      }
    };

    // Handle TaxTotal array
    const taxTotal = result['cac:TaxTotal'];
    let taxAmount = 0;
    let taxAmountCurrencyID = '';

    if (Array.isArray(taxTotal)) {
      // Sum up all tax amounts
      taxAmount = taxTotal.reduce(
        (sum, tax) => sum + parseFloatSafe(tax['cbc:TaxAmount']),
        0,
      );
      // Take currency ID from first tax entry
      taxAmountCurrencyID = getAttribute(
        taxTotal[0],
        'TaxAmount',
        'currencyID',
      );
    } else {
      taxAmount = parseFloatSafe(taxTotal?.['cbc:TaxAmount']);
      taxAmountCurrencyID = getAttribute(taxTotal, 'TaxAmount', 'currencyID');
    }
    const createDate = (dateStr: string | null) => {
      if (!dateStr) return null;
      const [year, month, day] = dateStr.split('-').map(Number);
      // Create date object with local timezone to avoid conversion
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    };

    return {
      uuid: getNestedValue(result, 'UUID'),
      invoiceNumber: getNestedValue(result, 'ID'),
      prefix: getDianValue(),
      paymentMethod: getNestedValue(result['cac:PaymentMeans'], 'ID'),
      companyId: company.id,
      thirdPartyId: thirdParty.id,
      type: type === 'Received' ? InvoiceType.RECEIVED : InvoiceType.SENT,
      issueDate: createDate(getNestedValue(result, 'IssueDate')),

      issueTime: new Date(
        `1970-01-01T${getNestedValue(result, 'IssueTime') || '00:00:00'}`,
      ),
      dueDate: getNestedValue(result['cac:PaymentMeans'], 'PaymentDueDate')
        ? createDate(
            getNestedValue(result['cac:PaymentMeans'], 'PaymentDueDate'),
          )
        : createDate(getNestedValue(result, 'IssueDate')),
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
      invoiceTaxTotalTaxAmount: taxAmount,
      invoiceTaxTotalTaxAmountCurrencyID: taxAmountCurrencyID,
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
    //console.log('result', result);
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
      //console.log('Empty line received');
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

    // Handle TaxTotal array
    const taxTotal = line['cac:TaxTotal'];
    let primaryTax = null;
    let secondaryTax = null;

    if (Array.isArray(taxTotal)) {
      [primaryTax, secondaryTax] = taxTotal;
    } else {
      primaryTax = taxTotal;
    }

    // Process primary tax
    const primaryTaxSubtotal = primaryTax?.['cac:TaxSubtotal'];
    const primaryTaxCategory = primaryTaxSubtotal?.['cac:TaxCategory'];
    const primaryTaxScheme = primaryTaxCategory?.['cac:TaxScheme'];

    // Process secondary tax if exists
    const secondaryTaxSubtotal = secondaryTax?.['cac:TaxSubtotal'];
    const secondaryTaxCategory = secondaryTaxSubtotal?.['cac:TaxCategory'];
    const secondaryTaxScheme = secondaryTaxCategory?.['cac:TaxScheme'];

    // Calculate total tax amount
    const totalTaxAmount = Array.isArray(taxTotal)
      ? taxTotal.reduce(
          (sum, tax) => sum + parseFloatSafe(tax['cbc:TaxAmount']),
          0,
        )
      : parseFloatSafe(taxTotal?.['cbc:TaxAmount']);

    // Add this helper function to handle discount calculation
    const getDiscount = (line: any) => {
      const allowanceCharge = line['cac:AllowanceCharge'];
      if (!allowanceCharge) return 0;

      // Handle both array and single object cases
      const allowances = Array.isArray(allowanceCharge)
        ? allowanceCharge
        : [allowanceCharge];

      // Sum up all discounts (where ChargeIndicator is false)
      return allowances.reduce((total, charge) => {
        const isCharge =
          charge['cbc:ChargeIndicator']?.__text === 'true' ||
          charge['cbc:ChargeIndicator'] === 'true';

        if (!isCharge) {
          const amount = parseFloatSafe(
            charge['cbc:Amount']?.__text || charge['cbc:Amount'],
          );
          return total + amount;
        }
        return total;
      }, 0);
    };

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
      taxTotalAmount: totalTaxAmount,
      taxTotalAmountCurrencyID: getAttribute(
        primaryTax,
        'TaxAmount',
        'currencyID',
      ),
      taxAmount: parseFloatSafe(primaryTax?.['cbc:TaxAmount']),
      taxPercent: parseFloatSafe(primaryTaxCategory?.['cbc:Percent']),
      taxSchemeName: getNestedValue(primaryTaxScheme, 'Name'),

      // Secondary tax details
      taxAmountSecondary: parseFloatSafe(secondaryTax?.['cbc:TaxAmount']),
      taxPercentSecondary: parseFloatSafe(
        secondaryTaxCategory?.['cbc:Percent'],
      ),
      taxSchemeNameSecondary: getNestedValue(secondaryTaxScheme, 'Name'),

      priceAmount: parseFloatSafe(line['cac:Price']?.['cbc:PriceAmount']),
      priceAmountCurrencyID: getAttribute(
        line['cac:Price'],
        'PriceAmount',
        'currencyID',
      ),
      baseQuantity: parseFloatSafe(line['cac:Price']?.['cbc:BaseQuantity']),
      baseQuantityUnitCode: getAttribute(
        line['cac:Price'],
        'BaseQuantity',
        'unitCode',
      ),
      discount: getDiscount(line),
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
    await Promise.allSettled(
      this.workers.map(
        (worker) =>
          new Promise<void>((resolve) => {
            worker.once('exit', () => resolve());
            worker.terminate();
          }),
      ),
    );
  }

  getJobStatus(jobId: string) {
    return this.jobStatus[jobId] || { status: 'not found', progress: 0 };
  }
}
