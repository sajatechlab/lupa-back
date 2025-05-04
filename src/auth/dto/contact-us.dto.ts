import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ContactUsDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
