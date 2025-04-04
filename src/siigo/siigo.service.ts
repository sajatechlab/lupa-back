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
@Injectable()
export class SiigoService {
  private readonly API_URL = 'https://api.siigo.com/';
  private readonly USERNAME =
    process.env.SIIGO_USERNAME || 'sandbox@siigoapi.com';
  private readonly ACCESS_KEY =
    process.env.SIIGO_ACCESS_KEY ||
    'NDllMzI0NmEtNjExZC00NGM3LWE3OTQtMWUyNTNlZWU0ZTM0OkosU2MwLD4xQ08=';

  constructor(
    private readonly siigoRepository: SiigoRepository,
    private readonly invoiceRepository: InvoiceRepository,
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

  async createPurchasesFromInvoices(companyId: string, invoiceIds: string[]) {
    try {
      console.log('invoiceIds', companyId, invoiceIds);

      const { token } = await this.getAuthToken(companyId);
      const invoices = await this.invoiceRepository.findInvoicesWithRelations(
        invoiceIds,
      );

      const results = [];
      console.log('invoices', invoices);

      // Process each invoice
      for (const invoice of invoices) {
        // if (!invoice.lines || invoice.lines.length === 0) {
        //   console.log(`No invoice lines found for invoice ${invoice.uuid}`);
        //   continue;
        // }
        const siigoPurchaseData = {
          document: {
            id: '29190', // Siigo will generate this 1
          },
          date: invoice.dueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD1
          number: 2,
          // supplier: {
          //   identification: invoice.thirdParty?.nit || '', //1
          //   branch_office: 0, //1
          // },
          supplier: {
            identification: '13832081',
            branch_office: 0,
          },
          //cost_center: 235, // You might want to make this configurable
          provider_invoice: {
            prefix: 'FV1',
            number: '1234',
          },

          observations: invoice.note || '', //1
          discount_type: 'Value', //1
          supplier_by_item: false, //1
          tax_included: false, //1
          items: invoice.lines.map((line) => ({
            type: 'Product',
            code: line.invoicedQuantityUnitCode || '',
            description: line.itemDescription || '',
            quantity: Number(line.quantity),
            price: line.priceAmount || 0,
            discount: 0,
            taxes: [
              {
                id: 1270,
              },
            ],
          })),
          payments: [
            {
              id: 8008,
              value: Number(invoice.invoicePayableAmount) || 0,
              // due_date:
              //   typeof invoice.dueDate === 'string'
              //     ? invoice.dueDate
              //     : invoice.dueDate?.toISOString().split('T')[0] ||
              //       invoice.issueDate.toISOString().split('T')[0],
            },
          ],
        };
        console.log('siigoPurchaseData', siigoPurchaseData.payments);

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
        console.log(response.data);
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
}
