import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import * as xml2js from 'xml2js';
import { InvoiceData } from './field_definitions';
import * as crypto from 'crypto';
import { Company } from '../company/entities/company.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceLine } from '../invoice/entities/invoice-line.entity';
import { SoftwareProvider } from '../software-provider/entities/software-provider.entity';
import { AttachmentsService } from 'src/attachments/attachments.service';

enum InvoiceType {
  RECEIVED = 'RECEIVED',
  SENT = 'SENT',
}

@Injectable()
export class TableDownloadService {
  private readonly axiosInstance;

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

    const startTime = Date.now();
    const tabulatedData: Record<string, any>[] = [];
    const downloadedFiles: string[] = [];

    try {
      // Extract NIT  from authUrl
      const nitMatch = authUrl.match(/rk=(\d+)/);

      if (!nitMatch) {
        throw new Error('Could not extract NIT ');
      }

      const urlNit = nitMatch[1];

      // Verify NIT matches
      if (urlNit !== nit) {
        throw new Error('NIT mismatch between URL and company record');
      }

      // Proceed with authentication
      const authResponse = await this.axiosInstance.get(authUrl);
      if (authResponse.status !== 200) {
        throw new Error(
          `Authentication failed with status ${authResponse.status}`,
        );
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
          nit,
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
        );
      }

      const totalSeconds = (Date.now() - startTime) / 1000;
      const avgSecondsPerDoc =
        downloadedFiles.length > 0 ? totalSeconds / downloadedFiles.length : 0;

      //console.log('Process completed successfully', {
      // totalDocuments: downloadedFiles.length,
      // totalSeconds,
      // avgSecondsPerDoc,
      //});

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
      // Start from the end date (most recent)
      let currentStartDate = startDate;
      let currentEndDate = endDate;
      let hasMoreData = true;

      while (hasMoreData) {
        const url = `https://catalogo-vpfe.dian.gov.co/Document/${type}`;
        console.log(
          `Requesting data from: ${url} from ${currentStartDate} to ${currentEndDate}`,
        );

        const requestBody = `startDate=${currentStartDate}&endDate=${currentEndDate}`;
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
        console.log(`Found ${rows.length} rows to process for ${type}`);

        // If we got 150 rows, we need to continue with an earlier date range
        if (rows.length === 150) {
          // Get the date from the oldest row in this batch (last row)
          const oldestRowDate = rows[rows.length - 1]['Fecha'];
          const newEndDate = new Date(oldestRowDate);
          // Set end date to one day before the oldest row we received
          newEndDate.setDate(newEndDate.getDate() - 1);
          currentEndDate = newEndDate.toISOString().split('T')[0];

          // If we've gone past the start date, we're done
          if (new Date(currentEndDate) < new Date(startDate)) {
            hasMoreData = false;
          }
        } else {
          // Less than 150 rows means we've got all data for this range
          hasMoreData = false;
        }

        for (const row of rows) {
          row['Tipo_Consulta'] = type;
        }

        tabulatedData.push(...rows);
        await this.downloadFiles(rows, downloadedFiles);

        // Add a small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error in processAndDownload for ${type}:`, error);
      throw error;
    }
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

    const validDocTipos = new Set(['96']);

    // Filter using the same logic as .NET
    tabulatedData = tabulatedData.filter((row) => {
      if (!row.hasOwnProperty('DocTipo')) {
        return false;
      }
      if (type === 'Received') {
        if (row['NIT Receptor'] !== nit) {
          throw new Error('Company nit does not match');
        }
      } else {
        if (row['NIT Emisor'] !== nit) {
          throw new Error('Company nit does not match');
        }
      }

      const docTipoValue = row['DocTipo']?.toString();

      if (docTipoValue === null || docTipoValue === undefined) {
        return false;
      }

      return !validDocTipos.has(docTipoValue);
    });
    //console.log('tabulatedData', tabulatedData);

    return tabulatedData;
  }

  // private async downloadFiles(
  //   rows: Record<string, any>[],
  //   downloadedFiles: string[],
  // ) {
  //   // Filter valid files first
  //   const validFiles = rows.filter(
  //     (row) => row['id'] && row['DocTipo'] === '01',
  //   );
  //   console.log(`Starting parallel processing of ${validFiles.length} files`);

  //   // First phase: Download all files in parallel
  //   const downloadPromises = validFiles.map(async (row) => {
  //     const startTime = Date.now();
  //     console.log(`Starting download for ${row['id']}`);

  //     try {
  //       const downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFiles?trackId=${row['id']}`;
  //       const response = await this.axiosInstance.get(downloadUrl, {
  //         responseType: 'arraybuffer',
  //       });

  //       console.log(
  //         `Downloaded ZIP for ${row['id']} in ${Date.now() - startTime}ms`,
  //       );
  //       return {
  //         success: true,
  //         id: row['id'],
  //         data: response.data,
  //         tipoConsulta: row['Tipo_Consulta'],
  //       };
  //     } catch (error) {
  //       console.error(`Failed to download ${row['id']}:`, error);
  //       return { success: false, id: row['id'] };
  //     }
  //   });

  //   const downloadResults = await Promise.all(downloadPromises);
  //   console.log(`All files downloaded. Starting processing...`);

  //   // Second phase: Process all successful downloads in parallel
  //   const processPromises = downloadResults
  //     .filter((result) => result.success)
  //     .map(async (result) => {
  //       try {
  //         const zip = new AdmZip(result.data);
  //         const zipEntries = zip.getEntries();

  //         // Process PDF and XML in parallel for each file
  //         await Promise.all(
  //           zipEntries.map(async (entry) => {
  //             const fileBuffer = entry.getData();
  //             const fileName = entry.entryName.split('.')[0];
  //             const pdfFileName = `${fileName}.pdf`;

  //             if (entry.entryName.endsWith('.pdf')) {
  //               await this.attachmentsService.uploadFile(
  //                 fileBuffer,
  //                 pdfFileName,
  //               );
  //             }
  //             if (entry.entryName.endsWith('.xml')) {
  //               const xmlContent = entry.getData().toString('utf8');
  //               await this.parseAndSaveXml(
  //                 xmlContent,
  //                 result.tipoConsulta as 'Received' | 'Sent',
  //                 pdfFileName,
  //               );
  //             }
  //           }),
  //         );

  //         console.log(`Completed processing ${result.id}`);
  //         return true;
  //       } catch (error) {
  //         console.error(`Error processing ${result.id}:`, error);
  //         return false;
  //       }
  //     });

  //   const processResults = await Promise.all(processPromises);
  //   const successCount = processResults.filter((success) => success).length;

  //   console.log(
  //     `Successfully processed ${successCount} out of ${validFiles.length} files`,
  //   );
  //   return successCount;
  // }

  async downloadFiles(rows: Record<string, any>[], downloadedFiles: string[]) {
    const downloadPromises = rows
      .filter((row) => row['id'] && row['DocTipo'] === '01')
      .map((row) => {
        const downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFiles?trackId=${row['id']}`;
        return this.downloadAndProcessZip(downloadUrl, row['Tipo_Consulta']);
      });

    // Run all downloads in parallel
    await Promise.all(downloadPromises);
    console.log(`Total files processed: ${downloadPromises.length}`);
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

      // Process all ZIP entries in parallel
      await Promise.all(
        zipEntries.map((entry) => this.processZipEntry(entry, type)),
      );
    } catch (error) {
      console.error('Error downloading or processing ZIP:', error);
    }
  }

  async processZipEntry(
    entry: AdmZip.IZipEntry,
    type: 'Received' | 'Sent',
  ): Promise<void> {
    const fileBuffer = entry.getData();
    const fileName = entry.entryName.split('.')[0];
    const pdfFileName = `${fileName}.pdf`;

    const tasks: Promise<any>[] = [];

    if (entry.entryName.endsWith('.pdf')) {
      tasks.push(this.attachmentsService.uploadFile(fileBuffer, pdfFileName));
    }

    if (entry.entryName.endsWith('.xml')) {
      const xmlContent = fileBuffer.toString('utf8');
      tasks.push(this.parseAndSaveXml(xmlContent, type, pdfFileName));
    }

    // Run all tasks in parallel
    await Promise.all(tasks);
  }

  async parseAndSaveXml(
    xmlContent: string,
    type: 'Received' | 'Sent',
    fileName: string,
  ): Promise<void> {
    const parser = new xml2js.Parser({
      explicitArray: false,
      trim: true,
      xmlns: true,
    });

    return new Promise((resolve, reject) => {
      parser.parseString(xmlContent, async (err, r) => {
        if (err) {
          console.error('Error parsing XML:', err);
          return reject(err);
        }

        try {
          const result = r.Invoice;
          const [thirdParty, company] =
            type === 'Received'
              ? [this.createSupplier(result), this.createCustomer(result)]
              : [this.createCustomer(result), this.createSupplier(result)];

          // **Upsert companies in parallel**
          const [thirdPartyData, companyData] = await Promise.all([
            this.upsertCompany(thirdParty),
            this.upsertCompany(company),
          ]);

          // **Create invoice**
          const invoiceData = this.createInvoice(
            result,
            companyData,
            thirdPartyData,
            type,
            fileName,
          );

          // **Upsert invoice & Retrieve ID in one step**
         await this.invoiceRepository.upsert(
            invoiceData,
            ['uuid'],
          );
          

          // **Insert invoice lines in bulk (faster)**
          const invoiceLines = this.createInvoiceLines(result);
          if (invoiceLines.length > 0) {
            await this.invoiceLineRepository.insert(invoiceLines);
          }

          // **Save software provider (non-blocking)**
          const providerID =
            result['ext:UBLExtensions']?.['ext:UBLExtension']?.[0]?.[
              'ext:ExtensionContent'
            ]?.['sts:DianExtensions']?.['sts:SoftwareProvider']?.[
              'sts:ProviderID'
            ]?._ || '';

          if (providerID) {
            this.softwareProviderRepository
              .createQueryBuilder()
              .insert()
              .into('software_provider')
              .values({ id: crypto.randomUUID(), nit: providerID })
              .orIgnore()
              .execute()
              .catch((err) =>
                console.error('Error saving software provider:', err),
              );
          }

          resolve();
        } catch (error) {
          console.error('Error in parseAndSaveXml:', error);
          reject(error);
        }
      });
    });
  }

  async upsertCompany(company: Partial<Company>): Promise<Company> {
    // First check if company exists
    const existing = await this.companyRepository.findOne({
      where: { nit: company.nit },
    });

    if (existing) {
      // If exists, update everything except the ID
      const updateData = { ...company };
      delete updateData.id; // Never update the ID
      await this.companyRepository.update({ nit: company.nit }, updateData);
      return existing;
    } else {
      // If new, create with new ID
      return await this.companyRepository.save(
        this.companyRepository.create(company),
      );
    }
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
      return target._ || target.__text;
    }
    return target;
  }

  private getAttribute(obj: any, key: string, attr: string) {
    if (!obj) return null;
    const nsKey = `cbc:${key}`;
    const nsValue = obj[nsKey];
    const value = obj[key];
    const target = nsValue || value;
    if (!target || !target.$) return null;
    return (
      target.$[attr]?.value || target.$[`@_${attr}`] || target[`@_${attr}`]
    );
  }

  private parseFloatSafe(value: any) {
    if (!value) return 0;
    const numStr = typeof value === 'object' ? value._ || value.__text : value;
    return isNaN(parseFloat(numStr)) ? 0 : parseFloat(numStr);
  }
}
