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
      // Step 1: Authentication
      const authResponse = await this.axiosInstance.get(authUrl);
      //console.log('Auth response status:', authResponse.status);

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
      //console.log('html', htmlContent);

      const rows = this.tabulateDataFromHtml(htmlContent, type, nit);
      console.log(`Found ${rows.length} rows to process for ${type}`);

      for (const row of rows) {
        row['Tipo_Consulta'] = type;
      }

      tabulatedData.push(...rows);
      await this.downloadFiles(rows, downloadedFiles);
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
          // if (type === 'Received') {
          //   console.log('NIT Receptor', rowData, headers);
          //   console.log('NIT', nit);
          //   if (rowData['NIT Receptor'] !== nit) {
          //     throw new Error('Company nit does not match');
          //     break;
          //   }
          // } else {
          //   if (rowData['NIT Emisor'] !== nit) {
          //     throw new Error('Company nit does not match');
          //     break;
          //   }
          // }
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
    console.log('tabulatedData', tabulatedData);

    return tabulatedData;
  }

  private async downloadFiles(
    rows: Record<string, any>[],
    downloadedFiles: string[],
  ) {
    let fileCount = 0;
    for (const row of rows) {
      const trackId = row['id'];
      if (!trackId) continue;
      const docTipo = row['DocTipo'];
      let downloadUrl: string;

      // NOTE: This is the logic for other document types
      // if (docTipo === '05' || docTipo === '102') {
      //   downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/GetFilePdf?cune=${trackId}`;
      // } else if (docTipo === '60') {
      //   downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFilesEquivalente?trackId=${trackId}`;
      // } else {
      //   downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFiles?trackId=${trackId}`;
      // }

      if (docTipo === '01') {
        fileCount++;
        downloadUrl = `https://catalogo-vpfe.dian.gov.co/Document/DownloadZipFiles?trackId=${trackId}`;
        const type = row['Tipo_Consulta'];
        await this.downloadAndProcessZip(downloadUrl, type);
      }
    }
    console.log(`Total files processed: ${fileCount}`);
  }

  async downloadAndProcessZip(
    url: string,
    type: 'Received' | 'Sent',
  ): Promise<void> {
    try {
      // Step 1: Download the ZIP file
      const response = await this.axiosInstance.get(url, {
        responseType: 'arraybuffer',
      });
      const zip = new AdmZip(response.data);

      // Step 2: Extract XML files from the ZIP
      const zipEntries = zip.getEntries();

      for (const entry of zipEntries) {
        const fileBuffer = entry.getData();
        const fileName = entry.entryName.split('.')[0];
        const pdfFileName = `${fileName}.pdf`;
        if (entry.entryName.endsWith('.pdf')) {
          await this.attachmentsService.uploadFile(fileBuffer, pdfFileName);
        }
        // Parse the XML content
        if (entry.entryName.endsWith('.xml')) {
          const xmlContent = entry.getData().toString('utf8');

          // Step 3: Parse the XML content
          await this.parseAndSaveXml(xmlContent, type, pdfFileName);
        }
      }
    } catch (error) {
      console.error('Error downloading or processing ZIP:', error);
    }
  }

  private async parseAndSaveXml(
    xmlContent: string,
    type: 'Received' | 'Sent',
    fileName: string,
  ): Promise<void> {
    const parser = new xml2js.Parser({
      explicitArray: false,
      trim: true,
      mergeAttrs: false,
      tagNameProcessors: [],
      attrNameProcessors: [],
      attrValueProcessors: [xml2js.processors.parseNumbers],
      valueProcessors: [xml2js.processors.parseNumbers],
      xmlns: true,
    });

    parser.parseString(xmlContent, async (err, r) => {
      if (err) {
        console.error('Error parsing XML:', err);
        return;
      }

      const result = r.Invoice;
      let thirdParty = null;
      let company = null;

      if (type === 'Received') {
        thirdParty = this.createSupplier(result);
        company = this.createCustomer(result);
      } else {
        thirdParty = this.createCustomer(result);
        company = this.createSupplier(result);
      }

      // Create or update Third Party
      let thirdPartyData = await this.companyRepository.findOne({
        where: { nit: thirdParty.nit },
      });

      if (!thirdPartyData) {
        thirdPartyData = this.companyRepository.create(
          thirdParty as Partial<Company>,
        );
        thirdPartyData = await this.companyRepository.save(thirdPartyData);
      } else {
        await this.companyRepository.update(
          { nit: thirdParty.nit },
          { ...thirdParty, id: undefined },
        );
      }

      // Create or update Company
      let companyData = await this.companyRepository.findOne({
        where: { nit: company.nit },
      });

      if (!companyData) {
        companyData = this.companyRepository.create(
          company as Partial<Company>,
        );
        companyData = await this.companyRepository.save(companyData);
      } else {
        await this.companyRepository.update(
          { nit: company.nit },
          { ...company, id: undefined },
        );
      }

      // Create Invoice
      // const invoiceData = this.createInvoice(
      //   result,
      //   companyData,
      //   thirdPartyData,
      //   type,
      //   fileName,
      // );
      // const existingInvoice = await this.invoiceRepository.findOne({
      //   where: { uuid: invoiceData.uuid },
      // });

      // if (!existingInvoice) {
      //   await this.invoiceRepository.save(invoiceData);

      // Create Invoice Lines
      const invoiceLines = this.createInvoiceLines(result);
      await this.invoiceLineRepository.save(invoiceLines);
      // }

      // Create or update Software Provider
      const softwareProviderData = {
        id: crypto.randomUUID(),
        nit:
          result['ext:UBLExtensions']?.['ext:UBLExtension']?.[0]?.[
            'ext:ExtensionContent'
          ]?.['sts:DianExtensions']?.['sts:SoftwareProvider']?.[
            'sts:ProviderID'
          ]._ || '',
      };

      await this.softwareProviderRepository
        .createQueryBuilder()
        .insert()
        .into('software_provider')
        .values(softwareProviderData)
        .orIgnore()
        .execute();
    });
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
        ],
      physicalLocationID:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PhysicalLocation'
        ]?.['cac:Address']?.['cbc:ID'],
      countrySubentityCode:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PhysicalLocation'
        ]?.['cac:Address']?.['cbc:CountrySubentityCode'],
      line: result['cac:AccountingSupplierParty']?.['cac:Party']?.[
        'cac:PhysicalLocation'
      ]?.['cac:Address']?.['cac:AddressLine']?.['cbc:Line'],
      registrationName:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:RegistrationName'],
      taxLevelCode:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:TaxLevelCode']?._,
      taxSchemeID:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cac:TaxScheme']?.['cbc:ID'],
      taxSchemeName:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cac:TaxScheme']?.['cbc:Name'],
      companyID:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']._,
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
        ],
      contactTelephone:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.['cac:Contact']?.[
          'cbc:Telephone'
        ],
      contactElectronicMail:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.['cac:Contact']?.[
          'cbc:ElectronicMail'
        ],
      nit:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']._ || '',
      name:
        result['cac:AccountingSupplierParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:RegistrationName'] || '',
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
        ],
      physicalLocationID:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PhysicalLocation'
        ]?.['cac:Address']?.['cbc:ID'],
      countrySubentityCode:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PhysicalLocation'
        ]?.['cac:Address']?.['cbc:CountrySubentityCode'],
      line: result['cac:AccountingCustomerParty']?.['cac:Party']?.[
        'cac:PhysicalLocation'
      ]?.['cac:Address']?.['cac:AddressLine']?.['cbc:Line'],
      registrationName:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:RegistrationName'],
      taxLevelCode:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:TaxLevelCode']?._,
      taxSchemeID:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cac:TaxScheme']?.['cbc:ID'],
      taxSchemeName:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cac:TaxScheme']?.['cbc:Name'],
      companyID:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']._,
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
        ],
      contactTelephone:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.['cac:Contact']?.[
          'cbc:Telephone'
        ],
      contactElectronicMail:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.['cac:Contact']?.[
          'cbc:ElectronicMail'
        ],
      nit:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:CompanyID']._ || '',
      name:
        result['cac:AccountingCustomerParty']?.['cac:Party']?.[
          'cac:PartyTaxScheme'
        ]?.['cbc:RegistrationName'] || '',
    };
  }

  private createInvoice(
    result: any,
    company: Company,
    thirdParty: Company,
    type: 'Received' | 'Sent',
    fileName: string,
  ) {
    return {
      uuid: result['cbc:UUID']._,
      invoiceNumber: result['cbc:ID'] || result['cbc:ID']._,
      companyId: company.id,
      thirdPartyId: thirdParty.id,
      type: type === 'Received' ? InvoiceType.RECEIVED : InvoiceType.SENT,
      issueDate: new Date(result['cbc:IssueDate']),
      issueTime: new Date(
        `1970-01-01T${result['cbc:IssueTime'] || '00:00:00'}`,
      ),
      dueDate: result['cbc:DueDate']
        ? new Date(result['cbc:DueDate'])
        : new Date(result['cbc:IssueDate']),
      invoiceTypeCode: result['cbc:InvoiceTypeCode']?._ || '',
      note:
        result['cbc:Note'] && Array.isArray(result['cbc:Note'])
          ? result['cbc:Note'].join(', ')
          : result['cbc:Note'],
      documentCurrencyCode: result['cbc:DocumentCurrencyCode']?._ || '',
      invoiceAllowanceChargeMultiplierFactorNumeric:
        result['cac:AllowanceCharge']?.['cbc:MultiplierFactorNumeric'],
      invoiceAllowanceChargeAmount:
        parseFloat(result['cac:AllowanceCharge']?.['cbc:Amount']?._) || 0,
      invoiceAllowanceChargeAmountCurrencyID:
        result['cac:AllowanceCharge']?.['cbc:Amount']?.['@_currencyID'],
      invoiceAllowanceChargeBaseAmount:
        parseFloat(result['cac:AllowanceCharge']?.['cbc:BaseAmount']?._) || 0,
      invoiceAllowanceChargeBaseAmountCurrencyID:
        result['cac:AllowanceCharge']?.['cbc:BaseAmount']?.['@_currencyID'],
      invoiceTaxTotalTaxAmount:
        parseFloat(result['cac:TaxTotal']?.['cbc:TaxAmount']?._) || 0,
      invoiceTaxTotalTaxAmountCurrencyID:
        result['cac:TaxTotal']?.['cbc:TaxAmount']?.['@_currencyID'],
      invoiceWithholdingTaxTotalTaxAmount:
        parseFloat(result['cac:WithholdingTaxTotal']?.['cbc:TaxAmount']?._) ||
        0,
      invoiceWithholdingTaxTotalTaxAmountCurrencyID:
        result['cac:WithholdingTaxTotal']?.['cbc:TaxAmount']?.['@_currencyID'],
      invoiceLineExtensionAmount:
        parseFloat(
          result['cac:LegalMonetaryTotal']?.['cbc:LineExtensionAmount']?._,
        ) || 0,
      invoiceTaxExclusiveAmount:
        parseFloat(
          result['cac:LegalMonetaryTotal']?.['cbc:TaxExclusiveAmount']?._,
        ) || 0,
      invoiceTaxInclusiveAmount:
        parseFloat(
          result['cac:LegalMonetaryTotal']?.['cbc:TaxInclusiveAmount']?._,
        ) || 0,
      invoiceAllowanceTotalAmount:
        parseFloat(
          result['cac:LegalMonetaryTotal']?.['cbc:AllowanceTotalAmount']?._,
        ) || 0,
      invoiceChargeTotalAmount:
        parseFloat(
          result['cac:LegalMonetaryTotal']?.['cbc:ChargeTotalAmount']?._,
        ) || 0,
      invoicePayableAmount:
        parseFloat(
          result['cac:LegalMonetaryTotal']?.['cbc:PayableAmount']?._,
        ) || 0,
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
          result['cbc:UUID']?._ || result['UUID']?._,
        ),
      ];
    }

    console.log('Processing multiple invoice lines');
    return invoiceLines.map((line: any) =>
      this.processInvoiceLine(line, result['cbc:UUID']?._ || result['UUID']?._),
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
      // Try with namespace prefix
      const nsKey = `cbc:${key}`;
      const nsValue = obj[nsKey];
      // Try without namespace prefix
      const value = obj[key];

      const target = nsValue || value;
      if (!target) return null;

      // Handle both direct values and nested structures
      if (typeof target === 'object') {
        return target._ || target.__text;
      }
      return target;
    };

    // Helper function to get attribute from nested structure
    const getAttribute = (obj: any, key: string, attr: string) => {
      if (!obj) return null;
      // Try with namespace prefix
      const nsKey = `cbc:${key}`;
      const nsValue = obj[nsKey];
      // Try without namespace prefix
      const value = obj[key];

      const target = nsValue || value;
      if (!target || !target.$) return null;

      // Handle both formats of attributes
      return (
        target.$[attr]?.value || target.$[`@_${attr}`] || target[`@_${attr}`]
      );
    };

    // Helper function to safely parse float values
    const parseFloatSafe = (value: any) => {
      if (!value) return null;
      const numStr =
        typeof value === 'object' ? value._ || value.__text : value;
      return isNaN(parseFloat(numStr)) ? null : parseFloat(numStr);
    };

    // Process note - handle both string and object formats
    const note = getNestedValue(line, 'Note');

    // Get values from the line object
    const lineID = getNestedValue(line, 'ID');
    const quantity = parseFloatSafe(
      line['cbc:InvoicedQuantity']?._ || line['InvoicedQuantity']?._,
    );
    const unitCode = getAttribute(line, 'InvoicedQuantity', 'unitCode');
    const lineExtensionAmount = parseFloatSafe(
      line['cbc:LineExtensionAmount']?._ || line['LineExtensionAmount']?._,
    );
    const currencyID = getAttribute(line, 'LineExtensionAmount', 'currencyID');

    // Get item description
    const itemDescription = getNestedValue(
      line['cac:Item'] || line.Item,
      'Description',
    );

    // Get standard item identification
    const standardItem =
      (line['cac:Item'] || line.Item)?.['cac:StandardItemIdentification'] ||
      (line['cac:Item'] || line.Item)?.StandardItemIdentification;
    const standardItemID = standardItem?.['cbc:ID']?._ || standardItem?.ID?._;
    const standardItemSchemeID =
      standardItem?.['cbc:ID']?.$.schemeID?.value ||
      standardItem?.ID?.$.schemeID?.value ||
      standardItem?.['cbc:ID']?.['@_schemeID'];

    // Get tax information
    const taxTotal = line['cac:TaxTotal'] || line.TaxTotal;
    const taxAmount = parseFloatSafe(
      taxTotal?.['cbc:TaxAmount']?._ || taxTotal?.TaxAmount?._,
    );
    const taxAmountCurrencyID = getAttribute(
      taxTotal,
      'TaxAmount',
      'currencyID',
    );

    // Get tax subtotal information
    const taxSubtotal = taxTotal?.['cac:TaxSubtotal'] || taxTotal?.TaxSubtotal;
    const taxableAmount = parseFloatSafe(
      taxSubtotal?.['cbc:TaxableAmount']?._ || taxSubtotal?.TaxableAmount?._,
    );
    const taxableAmountCurrencyID = getAttribute(
      taxSubtotal,
      'TaxableAmount',
      'currencyID',
    );

    // Get tax category information
    const taxCategory =
      taxSubtotal?.['cac:TaxCategory'] || taxSubtotal?.TaxCategory;
    const taxPercent = parseFloatSafe(
      taxCategory?.['cbc:Percent']?._ || taxCategory?.Percent?._,
    );

    // Get tax scheme information
    const taxScheme = taxCategory?.['cac:TaxScheme'] || taxCategory?.TaxScheme;
    const taxSchemeID = getNestedValue(taxScheme, 'ID');
    const taxSchemeName = getNestedValue(taxScheme, 'Name');

    // Get price information
    const price = line['cac:Price'] || line.Price;
    const priceAmount = parseFloatSafe(
      price?.['cbc:PriceAmount']?._ || price?.PriceAmount?._,
    );
    const priceAmountCurrencyID = getAttribute(
      price,
      'PriceAmount',
      'currencyID',
    );
    const baseQuantity = parseFloatSafe(
      price?.['cbc:BaseQuantity']?._ || price?.BaseQuantity?._,
    );
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
}
