import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { EInvoiceProvider } from '../enums/invoice-provider.enum';

export class ProviderConfigDto {

  @IsEnum(EInvoiceProvider)
  provider: EInvoiceProvider;

  @ValidateIf((o) => o.provider === EInvoiceProvider.WORLD_OFFICE)
  @IsNotEmpty()
  @IsString()
  companyName?: string;

  @ValidateIf((o) => o.provider === EInvoiceProvider.WORLD_OFFICE)
  @IsNotEmpty()
  @IsString()
  prefix?: string;

  @ValidateIf((o) => o.provider === EInvoiceProvider.WORLD_OFFICE)
  @IsNotEmpty()
  @IsString()
  documentType?: string;
}
