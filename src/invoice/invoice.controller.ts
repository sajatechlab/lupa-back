import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceType } from './enums/invoice-type.enum';
import { Response } from 'express';
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  //@Post()
  // create(@Body() createInvoiceDto: CreateInvoiceDto) {
  //   return this.invoiceService.create(createInvoiceDto);
  // }
  @Get()
  findAll(@Query('type') type?: InvoiceType) {
    return this.invoiceService.findAll(type);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.invoiceService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
  //   return this.invoiceService.update(+id, updateInvoiceDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.invoiceService.remove(+id);
  // }

  @Get('metrics')
  async getMetrics() {
    return this.invoiceService.getInvoiceMetrics();
  }
  @Get('download/:id')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.invoiceService.downloadFile(id);

    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${id}"`,
    });

    return res.send(file.buffer);
  }

  @Get(':id/lines')
  async getLines(@Param('id') id: string) {
    return this.invoiceService.getLines(id);
  }
}
