import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { SiigoService } from './siigo.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { log } from 'console';
import { CreatePurchasesDto } from './dto/create-purchases.dto';
import { ValidationPipe } from '@nestjs/common';
import { Request } from 'express';

@Controller('siigo')
export class SiigoController {
  constructor(private readonly siigoService: SiigoService) {}

  @Get('auth-token/:companyId')
  async getAuthToken(@Param('companyId') companyId: string) {
    const token = this.siigoService.getAuthToken(companyId);
    if (token) {
      return { message: 'Token retrieved successfully' };
    }
  }

  @Post('companies/:companyId/purchases')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createPurchasesFromInvoices(
    @Param('companyId') companyId: string,
    @Body() createPurchasesDto: any,
  ) {
    // if (!createPurchasesDto || !createPurchasesDto.invoiceData) {
    //   throw new BadRequestException('Missing invoiceIds in request body');
    // }

    return this.siigoService.createPurchasesFromInvoices(
      companyId,
      createPurchasesDto.purchases,
    );
  }

  @Get('companies/:companyId/document-types')
  async getDocumentTypes(@Param('companyId') companyId: string) {
    console.log('companyId', companyId);

    return this.siigoService.getDocumentTypes(companyId);
  }
  @Get('companies/:companyId/products')
  async getProducts(@Param('companyId') companyId: string) {
    return this.siigoService.getProducts(companyId);
  }

  @Get('companies/:companyId/taxes')
  async getTaxes(@Param('companyId') companyId: string) {
    return this.siigoService.getTaxes(companyId);
  }

  @Get('companies/:companyId/fixed-assets')
  async getFixedAssets(@Param('companyId') companyId: string) {
    return this.siigoService.getFixedAssets(companyId);
  }

  @Get('companies/:companyId/payments-type')
  async getPaymentsType(@Param('companyId') companyId: string) {
    return this.siigoService.getPaymentsType(companyId);
  }
}
