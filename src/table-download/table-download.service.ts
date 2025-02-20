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
import { PrismaService } from '../prisma.service';
import * as xml2js from 'xml2js';
import { InvoiceData } from './field_definitions';
import * as crypto from 'crypto';
import { Company, Prisma } from '@prisma/client';

enum InvoiceType {
  RECEIVED = 'RECEIVED',
  SENT = 'SENT',
}

@Injectable()
export class TableDownloadService {
  private readonly axiosInstance;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
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
        if (entry.entryName.endsWith('.xml')) {
          const xmlContent = entry.getData().toString('utf8');

          // Step 3: Parse the XML content
          await this.parseAndSaveXml(xmlContent, type);
        }
      }
    } catch (error) {
      console.error('Error downloading or processing ZIP:', error);
    }
  }

  private async parseAndSaveXml(
    xmlContent: string,
    type: 'Received' | 'Sent',
  ): Promise<void> {
    const parser = new xml2js.Parser({
      explicitArray: false, // Ensures all elements are arrays
      trim: true, // Trims whitespace
      mergeAttrs: false, // Keeps attributes separate
    });

    parser.parseString(xmlContent, async (err, r) => {
      if (err) {
        console.error('Error parsing XML:', err);
        return;
      }

      // Log the parsed result to inspect its structure
      //console.log('Parsed XML Result:', r.Invoice);
      const result = r.Invoice;
      // Extract relevant fields with checks
      let thirdParty = null;
      let company = null;

      if (type === 'Received') {
        thirdParty = this.createSupplier(result);
        company = this.createCustomer(result);
      } else {
        thirdParty = this.createCustomer(result);
        company = this.createSupplier(result);
      }

      // Create Third Party
      const thirdPartyData = await this.prisma.company.upsert({
        where: { nit: thirdParty?.nit },
        update: {
          ...thirdParty,
          id: undefined, // Exclude id from update
        },
        create: thirdParty,
      });

      const companyData = await this.prisma.company.upsert({
        where: { nit: company?.nit },
        update: {
          ...company,
          id: undefined, // Exclude id from update
        },
        create: company,
      });

      // Create Invoice with updated structure
      const invoiceData = this.createInvoice(
        result,
        companyData,
        thirdPartyData,
        type,
      );

      const existingInvoice = await this.prisma.invoice.findUnique({
        where: { uuid: invoiceData.uuid },
      });

      if (!existingInvoice) {
        await this.prisma.invoice.create({ data: invoiceData as any });

        // Create Invoice Lines
        const invoiceLines = this.createInvoiceLines(result);

        // Create Invoice Lines
        await this.prisma.invoiceLine.createMany({
          data: invoiceLines,
        });
      }

      // Create Software Provider
      const softwareProviderData = {
        id: crypto.randomUUID(),
        nit:
          result['ext:UBLExtensions']?.['ext:UBLExtension']?.[0]?.[
            'ext:ExtensionContent'
          ]?.['sts:DianExtensions']?.['sts:SoftwareProvider']?.[
            'sts:ProviderID'
          ]._ || '',
      };

      await this.prisma.softwareProvider.upsert({
        where: {
          nit: softwareProviderData.nit,
        },
        update: {},
        create: softwareProviderData,
      });
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
    };
  }
  private createInvoiceLines(result: any) {
    if (!Array.isArray(result['cac:InvoiceLine'])) {
      const line = result['cac:InvoiceLine'];
      return [
        {
          id: crypto.randomUUID(),
          invoiceId: result['cbc:UUID']._,
          lineID: line['cbc:ID']?._,
          itemDescription: line['cac:Item']?.['cbc:Description']?._,
          quantity: line['cbc:InvoicedQuantity']?._,
          note: line['cbc:Note']?._,
          invoicedQuantityUnitCode:
            line['cbc:InvoicedQuantity']?.['@_unitCode'],
          lineExtensionAmount: line['cbc:LineExtensionAmount']?._,
          buyersItemID:
            line['cac:Item']?.['cbc:BuyersItemIdentification']?.['cbc:ID']?._,
          standardItemID:
            line['cac:Item']?.['cac:StandardItemIdentification']?.['cbc:ID']?._,
          standardItemSchemeID:
            line['cac:Item']?.['cac:StandardItemIdentification']?.['cbc:ID']?.[
              '@_schemeID'
            ],
          standardItemSchemeName:
            line['cac:Item']?.['cac:StandardItemIdentification']?.['cbc:ID']?.[
              '@_schemeName'
            ],
          taxTotalAmount: line['cac:TaxTotal']?.[0]?.['cbc:TaxAmount']?._,
          taxTotalAmountCurrencyID:
            line['cac:TaxTotal']?.[0]?.['cbc:TaxAmount']?.['@_currencyID'],
          taxableAmount:
            line['cac:TaxTotal']?.[0]?.['cac:TaxSubtotal']?.[
              'cbc:TaxableAmount'
            ]?._,
          taxableAmountCurrencyID:
            line['cac:TaxTotal']?.[0]?.['cac:TaxSubtotal']?.['@_currencyID'],
          taxSchemeID:
            line['cac:TaxTotal']?.[0]?.['cac:TaxSubtotal']?.[
              'cac:TaxCategory'
            ]?.['cac:TaxScheme']?.['cbc:ID']?._,
          taxSchemeName:
            line['cac:TaxTotal']?.[0]?.['cac:TaxSubtotal']?.[
              'cac:TaxCategory'
            ]?.['cac:TaxScheme']?.['cbc:Name']?._,
          priceAmount: line['cac:Price']?.['cbc:PriceAmount']?._,
          priceAmountCurrencyID:
            line['cac:Price']?.['cbc:PriceAmount']?.['@_currencyID'],
          allowanceChargeID: line['cac:AllowanceCharge']?.[0]?.['cbc:ID']?._,
          allowanceChargeIndicator:
            line['cac:AllowanceCharge']?.[0]?.['cbc:ChargeIndicator']?._ ===
            'true',
          allowanceChargeMultiplierFactorNumeric:
            line['cac:AllowanceCharge']?.[0]?.['cbc:MultiplierFactorNumeric']
              ?._,
          allowanceChargeAmount:
            line['cac:AllowanceCharge']?.[0]?.['cbc:Amount']?._,
          allowanceChargeAmountCurrency:
            line['cac:AllowanceCharge']?.[0]?.['cbc:Amount']?.['@_currencyID'],
          allowanceChargeBaseAmount:
            line['cac:AllowanceCharge']?.[0]?.['cbc:BaseAmount']?._,
          withholdingTaxTotalAmount:
            line['cac:WithholdingTaxTotal']?.[0]?.['cbc:TaxAmount']?._,
          withholdingTaxTotalAmountCurrency:
            line['cac:WithholdingTaxTotal']?.[0]?.['cbc:TaxAmount']?.[
              '@_currencyID'
            ],
          withholdingTaxableAmount:
            line['cac:WithholdingTaxTotal']?.[0]?.['cac:TaxSubtotal']?.[
              'cbc:TaxableAmount'
            ]?._,
          withholdingTaxPercent:
            line['cac:WithholdingTaxTotal']?.[0]?.['cac:TaxSubtotal']?.[
              'cbc:Percent'
            ]?._,
          withholdingTaxSchemeID:
            line['cac:WithholdingTaxTotal']?.[0]?.['cac:TaxSubtotal']?.[
              'cac:TaxCategory'
            ]?.['cac:TaxScheme']?.['cbc:ID']?._,
        },
      ];
    }
    return result['cac:InvoiceLine'].map((line: any) => ({
      id: crypto.randomUUID(),
      invoiceId: result['cbc:UUID']._,
      lineID: line['cbc:ID']?._,
      itemDescription: line['cac:Item']?.['cbc:Description']?._,
      quantity: line['cbc:InvoicedQuantity']?._,
      note: line['cbc:Note']?._,
      invoicedQuantityUnitCode: line['cbc:InvoicedQuantity']?.['@_unitCode'],
      lineExtensionAmount: line['cbc:LineExtensionAmount']?._,
      buyersItemID:
        line['cac:Item']?.['cbc:BuyersItemIdentification']?.['cbc:ID']?._,
      standardItemID:
        line['cac:Item']?.['cac:StandardItemIdentification']?.['cbc:ID']?._,
      standardItemSchemeID:
        line['cac:Item']?.['cac:StandardItemIdentification']?.['cbc:ID']?.[
          '@_schemeID'
        ],
      standardItemSchemeName:
        line['cac:Item']?.['cac:StandardItemIdentification']?.['cbc:ID']?.[
          '@_schemeName'
        ],
      taxTotalAmount: line['cac:TaxTotal']?.[0]?.['cbc:TaxAmount']?._,
      taxTotalAmountCurrencyID:
        line['cac:TaxTotal']?.[0]?.['cbc:TaxAmount']?.['@_currencyID'],
      taxableAmount:
        line['cac:TaxTotal']?.[0]?.['cac:TaxSubtotal']?.['cbc:TaxableAmount']
          ?._,
      taxableAmountCurrencyID:
        line['cac:TaxTotal']?.[0]?.['cac:TaxSubtotal']?.['cbc:TaxableAmount']?.[
          '@_currencyID'
        ],
      taxSchemeID:
        line['cac:TaxTotal']?.[0]?.['cac:TaxSubtotal']?.['cac:TaxCategory']?.[
          'cac:TaxScheme'
        ]?.['cbc:ID']?._,
      taxSchemeName:
        line['cac:TaxTotal']?.[0]?.['cac:TaxSubtotal']?.['cac:TaxCategory']?.[
          'cac:TaxScheme'
        ]?.['cbc:Name']?._,
      priceAmount: line['cac:Price']?.['cbc:PriceAmount']?._,
      priceAmountCurrencyID:
        line['cac:Price']?.['cbc:PriceAmount']?.['@_currencyID'],
      allowanceChargeID: line['cac:AllowanceCharge']?.[0]?.['cbc:ID']?._,
      allowanceChargeIndicator:
        line['cac:AllowanceCharge']?.[0]?.['cbc:ChargeIndicator']?._ === 'true',
      allowanceChargeMultiplierFactorNumeric:
        line['cac:AllowanceCharge']?.[0]?.['cbc:MultiplierFactorNumeric']?._,
      allowanceChargeAmount:
        line['cac:AllowanceCharge']?.[0]?.['cbc:Amount']?._,
      allowanceChargeAmountCurrency:
        line['cac:AllowanceCharge']?.[0]?.['cbc:Amount']?.['@_currencyID'],
      allowanceChargeBaseAmount:
        line['cac:AllowanceCharge']?.[0]?.['cbc:BaseAmount']?._,
      withholdingTaxTotalAmount:
        line['cac:WithholdingTaxTotal']?.[0]?.['cbc:TaxAmount']?._,
      withholdingTaxTotalAmountCurrency:
        line['cac:WithholdingTaxTotal']?.[0]?.['cbc:TaxAmount']?.[
          '@_currencyID'
        ],
      withholdingTaxableAmount:
        line['cac:WithholdingTaxTotal']?.[0]?.['cac:TaxSubtotal']?.[
          'cbc:TaxableAmount'
        ]?._,
      withholdingTaxPercent:
        line['cac:WithholdingTaxTotal']?.[0]?.['cac:TaxSubtotal']?.[
          'cac:TaxCategory'
        ]?.['cbc:Percent']?._,
      withholdingTaxSchemeID:
        line['cac:WithholdingTaxTotal']?.[0]?.['cac:TaxSubtotal']?.[
          'cac:TaxCategory'
        ]?.['cac:TaxScheme']?.['cbc:ID']?._,
    }));
  }
}
