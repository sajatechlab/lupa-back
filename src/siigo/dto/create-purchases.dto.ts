import { IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchasesDto {
  @IsArray()
  invoiceData: InvoiceData[];
}

export class InvoiceData {
  @IsString()
  invoiceId: string;

  @IsString()
  documentId: string;
}
