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

  @Public()
  @Get('auth-token/:companyId')
  async getAuthToken(@Param('companyId') companyId: string) {
    return this.siigoService.getAuthToken(companyId);
  }

  @Public()
  @Post('companies/:companyId/purchases')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createPurchasesFromInvoices(
    @Param('companyId') companyId: string,
    @Body() createPurchasesDto: CreatePurchasesDto,
  ) {
    if (!createPurchasesDto || !createPurchasesDto.invoiceIds) {
      throw new BadRequestException('Missing invoiceIds in request body');
    }

    return this.siigoService.createPurchasesFromInvoices(
      companyId,
      createPurchasesDto.invoiceIds,
    );
  }
}
