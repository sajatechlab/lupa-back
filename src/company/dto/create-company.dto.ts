import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsOptional()
  additionalAccountID?: string;

  @IsString()
  @IsOptional()
  industryClassificationCode?: string;

  @IsString()
  @IsOptional()
  physicalLocationID?: string;

  @IsString()
  @IsOptional()
  countrySubentityCode?: string;

  @IsString()
  @IsOptional()
  line?: string;

  @IsString()
  @IsOptional()
  registrationName?: string;

  @IsString()
  @IsOptional()
  taxLevelCode?: string;

  @IsString()
  @IsOptional()
  taxSchemeID?: string;

  @IsString()
  @IsOptional()
  taxSchemeName?: string;

  @IsString()
  @IsOptional()
  companyID?: string;

  @IsString()
  @IsOptional()
  companyIDSchemeID?: string;

  @IsString()
  @IsOptional()
  companyIDSchemeName?: string;

  @IsString()
  @IsOptional()
  companyIDSchemeAgencyID?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsString()
  @IsOptional()
  contactTelephone?: string;

  @IsString()
  @IsOptional()
  contactTelefax?: string;

  @IsString()
  @IsOptional()
  contactElectronicMail?: string;

  @IsString()
  @IsOptional()
  contactNote?: string;

  @IsString()
  @IsOptional()
  registrationAddressID?: string;

  @IsString()
  @IsNotEmpty()
  nit: string;
  
  @IsString()
  @IsNotEmpty()
  name: string;
}
