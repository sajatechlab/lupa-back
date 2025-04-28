import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-company.dto';
import { DocumentType } from '../enums/document-type.enum';
import { EInvoiceProviderEnum } from '../enums/invoice-provider.enum';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  legalRepDocumentType?: DocumentType;
  legalRepDocumentNumber?: string;
  provider?: EInvoiceProviderEnum;
}
