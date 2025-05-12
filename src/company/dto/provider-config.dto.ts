import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { EInvoiceProviderEnum } from '../enums/invoice-provider.enum';

export class ProviderConfigDto {
  @IsEnum(EInvoiceProviderEnum)
  provider: EInvoiceProviderEnum;

  @ValidateIf((o) => o.provider === EInvoiceProviderEnum.WORLD_OFFICE)
  @IsNotEmpty()
  @IsString()
  companyName?: string;

  @ValidateIf((o) => o.provider === EInvoiceProviderEnum.WORLD_OFFICE)
  @IsOptional()
  @IsString()
  prefix?: string;

  @ValidateIf((o) => o.provider === EInvoiceProviderEnum.WORLD_OFFICE)
  @IsNotEmpty()
  @IsString()
  documentType?: string;

  @ValidateIf((o) => o.provider === EInvoiceProviderEnum.SIIGO)
  @IsNotEmpty()
  @IsString()
  siigoUsername?: string;

  @ValidateIf((o) => o.provider === EInvoiceProviderEnum.SIIGO)
  @IsNotEmpty()
  @IsString()
  siigoAccessKey?: string;
}
