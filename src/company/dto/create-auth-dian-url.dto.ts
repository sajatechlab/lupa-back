import { IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { DocumentType } from '../enums/document-type.enum';

export class CreateAuthDianUrlDto {
  @IsEnum(DocumentType)
  @IsOptional()
  legalRepDocumentType: DocumentType;

  @IsOptional()
  legalRepDocumentNumber: string;

  @IsNotEmpty()
  nit: string;
}
