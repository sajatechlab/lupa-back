import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateSiigoDto } from './dto/create-siigo.dto';
import { UpdateSiigoDto } from './dto/update-siigo.dto';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiigoToken } from './entities/siigo-token.entity';
import { Company } from '../company/entities/company.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceLine } from '../invoice/entities/invoice-line.entity';
import { In } from 'typeorm';
import { InvoiceType } from 'src/invoice/enums/invoice-type.enum';
import { SiigoRepository } from './siigo.repository';
import { InvoiceRepository } from 'src/invoice/invoice.repository';
import { EInvoiceProviderRepository } from 'src/company/einvoice-provider.repository';
@Injectable()
export class SiigoService {
  private readonly API_URL = 'https://api.siigo.com/';
  private USERNAME;
  private ACCESS_KEY;

  constructor(
    private readonly siigoRepository: SiigoRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly eInvoiceProviderRepository: EInvoiceProviderRepository,
  ) {}

  async getAuthToken(
    companyId: string,
  ): Promise<{ token: string; tokenExpiration: number }> {
    try {
      const storedToken = await this.siigoRepository.findValidToken(companyId);
      const currentTime = Date.now();

      console.log('Token check:', {
        exists: !!storedToken,
        expiration: storedToken ? new Date(storedToken.tokenExpiration) : null,
        currentTime: new Date(currentTime),
      });

      if (storedToken && currentTime < storedToken.tokenExpiration) {
        console.log('Using existing token');
        return {
          token: storedToken.accessToken,
          tokenExpiration: storedToken.tokenExpiration,
        };
      }
      const siigoCredtentials =
        await this.eInvoiceProviderRepository.findByCompanyId(companyId);
      if (!siigoCredtentials) {
        console.log('No Siigo credentials found for company:', companyId);
        throw new HttpException(
          'No Siigo credentials found for company',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!siigoCredtentials.username || !siigoCredtentials.accessKey) {
        console.log('Siigo credentials are incomplete for company:', companyId);
        throw new HttpException(
          'Siigo credentials are incomplete for company',
          HttpStatus.UNAUTHORIZED,
        );
      }
      this.USERNAME = siigoCredtentials.username;
      this.ACCESS_KEY = siigoCredtentials.accessKey;
      console.log('Getting new token from Siigo');
      const response = await axios.post(`${this.API_URL}auth`, {
        username: this.USERNAME,
        access_key: this.ACCESS_KEY,
      });

      const { access_token, expires_in } = response.data;
      const tokenExpiration = currentTime + expires_in * 1000; // Convert seconds to milliseconds

      const savedToken = await this.siigoRepository.saveToken(
        access_token,
        tokenExpiration,
        companyId,
      );

      console.log('New token saved, expires:', new Date(tokenExpiration));

      return {
        token: savedToken.accessToken,
        tokenExpiration: savedToken.tokenExpiration,
      };
    } catch (error) {
      console.error('Error in token management:', error);
      throw new HttpException(
        'Failed to get or refresh token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // async createPurchase(companyId: string, purchaseData: CreatePurchaseDto) {
  //   try {
  //     // Get valid token
  //     const { token } = await this.getAuthToken(companyId);

  //     // Prepare the purchase data for Siigo API
  //     const siigoPurchaseData = {
  //       document: {
  //         id: 0, // Siigo will generate this
  //         date: dueDate.toISOString(),
  //         seller: 0, // You might need to map this to your seller ID
  //         customer: 0, // You might need to map this to your customer ID
  //         seller_identification: '', // Add seller identification
  //         customer_identification: '', // Add customer identification
  //         seller_name: '', // Add seller name
  //         customer_name: '', // Add customer name
  //         seller_address: '', // Add seller address
  //         customer_address: '', // Add customer address
  //         seller_phone: '', // Add seller phone
  //         customer_phone: '', // Add customer phone
  //         seller_email: '', // Add seller email
  //         customer_email: '', // Add customer email
  //         observations: purchaseData.notes || '',
  //         items: purchaseData.items.map((item) => ({
  //           code: item.code,
  //           description: item.description,
  //           quantity: item.quantity,
  //           price: item.price,
  //           tax: item.tax || 0,
  //           discount: item.discount || 0,
  //           total: item.quantity * item.price,
  //         })),
  //         payments: [
  //           {
  //             id: 0,
  //             value: purchaseData.total,
  //             date: purchaseData.date.toISOString(),
  //             payment_method: 'Cash', // You might want to make this configurable
  //             status: 'Paid',
  //           },
  //         ],
  //       },
  //     };

  //     // Make the API call to Siigo
  //     const response = await axios.post(
  //       `${this.API_URL}v1/purchases`,
  //       siigoPurchaseData,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           'Content-Type': 'application/json',
  //         },
  //       },
  //     );

  //     return response.data;
  //   } catch (error) {
  //     console.error(
  //       'Error creating purchase in Siigo:',
  //       error.response?.data || error.message,
  //     );
  //     throw new HttpException(
  //       'Failed to create purchase in Siigo',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  async createPurchasesFromInvoices(companyId: string, invoiceData: any[]) {
    try {
      const invoiceIds = invoiceData.map((data) => data.invoiceId);

      const { token } = await this.getAuthToken(companyId);
      const invoices = await this.invoiceRepository.findInvoicesWithRelations(
        invoiceIds,
      );
      const taxesType = await this.getTaxes(companyId);
      //
      const results = [];

      // Process each invoice
      for (const invoice of invoices) {
        const invoiceFrontData = invoiceData.find(
          (data) => data.invoiceId === invoice.uuid,
        );
        // const documentId = invoiceData.find(
        //   (data) => data.invoiceId === invoice.uuid,
        // )?.documentId;
        // const documentType = documentTypes.find(
        //   (type) => (type.id = documentId),
        // );
        const siigoPurchaseData = {
          document: {
            id: invoiceFrontData.documentTypeId,
          },
          date: invoice.issueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD1
          provider_invoice: {
            prefix: invoice.prefix,
            number: invoice.invoiceNumber.substring(invoice.prefix.length),
          },
          supplier: {
            identification: invoice.thirdParty?.nit,
          },
          // TODO: ADD DISCOUNT TYPE
          observations: invoice.note || '',
          retentions: [
            ...(invoiceFrontData.reteICAId
              ? [{ id: invoiceFrontData.reteICAId }]
              : []),
            ...(invoiceFrontData.reteIVAId
              ? [{ id: invoiceFrontData.reteIVAId }]
              : []),
          ],
          items: invoiceFrontData.lines.map((line) => {
            const lineDB = invoice.lines.find(
              (l: InvoiceLine) => l.lineID === line.lineId,
            );
            const taxPrimary =
              lineDB.taxSchemeName &&
              taxesType.find(
                (tax) =>
                  tax.type === lineDB.taxSchemeName &&
                  tax.percentage === Number(lineDB.taxPercent),
              );
            const taxSecondary =
              lineDB.taxSchemeNameSecondary &&
              taxesType.find(
                (tax) =>
                  tax.type === lineDB.taxSchemeNameSecondary &&
                  tax.percentage === Number(lineDB.taxPercentSecondary),
              );
            return {
              type: line.lineType,
              code: line.productId,
              description: line.description,
              quantity: Number(line.quantity),
              price: line.unitPrice,
              discount: line.discountAmount,
              taxes: [
                ...(taxPrimary ? [{ id: taxPrimary.id }] : []),
                ...(line.taxSecondary ? [{ id: taxSecondary.id }] : []),
                ...(line.retentionId ? [{ id: line.retentionId }] : []),
              ],
            };
          }),
          payments: [
            {
              id: invoiceFrontData.paymentTypeId,
              value:
                Number(Number(invoiceFrontData.finalTotal).toFixed(0)) || 0,
              ...(invoice.dueDate
                ? {
                    due_date:
                      typeof invoice.dueDate === 'string'
                        ? invoice.dueDate
                        : invoice.dueDate.toISOString().split('T')[0],
                  }
                : {
                    due_date: invoice.issueDate.toISOString().split('T')[0],
                  }),
            },
          ],
        };
        console.log('siigoPurchaseData', siigoPurchaseData);
        // Make the API call to Siigo
        const response = await axios.post(
          `${this.API_URL}v1/purchases`,
          siigoPurchaseData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Partner-Id': 'Lupa',
            },
          },
        );
        console.log('response.data', response.data);
        results.push({
          invoiceId: invoice.uuid,
          siigoResponse: response.data,
        });
      }

      return results;
    } catch (error) {
      console.error('Error creating purchases in Siigo:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        params: error.response?.data?.errors?.[0]?.params,
        message: error.message,
      });

      console.log('Error Params:', error.response?.data);

      throw new HttpException(
        `Failed to create purchase in Siigo: ${JSON.stringify(
          error.response?.data || error.message,
        )}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDocumentTypes(companyId: string) {
    try {
      const { token } = await this.getAuthToken(companyId);
      const response = await axios.get(
        `${this.API_URL}v1/document-types?type=FC`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Partner-Id': 'Lupa',
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching document types:', error);
      throw new HttpException(
        'Failed to fetch document types',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getProducts(companyId: string) {
    try {
      const { token } = await this.getAuthToken(companyId);
      const response = await axios.get(
        `${this.API_URL}v1/products?page=1&page_size=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Partner-Id': 'Lupa',
          },
        },
      );
      return response.data.results.map((product) => ({
        name: product.name,
        code: product.code,
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new HttpException(
        'Failed to fetch products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTaxes(companyId: string) {
    try {
      const { token } = await this.getAuthToken(companyId);
      const response = await axios.get(`${this.API_URL}v1/taxes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Partner-Id': 'Lupa',
        },
      });
      console.log('taxes response', response.data);

      return response.data;
    } catch (error) {
      console.error('Error fetching taxes:', error);
      throw new HttpException(
        'Failed to fetch taxes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFixedAssets(companyId: string) {
    try {
      const { token } = await this.getAuthToken(companyId);
      const response = await axios.get(`${this.API_URL}v1/fixed-assets`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Partner-Id': 'Lupa',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching fixed assets:', error);
      throw new HttpException(
        'Failed to fetch fixed assets',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPaymentsType(companyId: string) {
    try {
      const { token } = await this.getAuthToken(companyId);
      const response = await axios.get(
        `${this.API_URL}v1/payment-types?document_type=FC`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Partner-Id': 'Lupa',
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching payment types:', error);
      throw new HttpException(
        'Failed to fetch payment types',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
