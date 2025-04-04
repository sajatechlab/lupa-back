import { IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchasesDto {
  @IsArray()
  @IsString({ each: true })
  invoiceIds: string[];
}
