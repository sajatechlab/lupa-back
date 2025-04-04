import { PartialType } from '@nestjs/mapped-types';
import { CreateSiigoDto } from './create-siigo.dto';

export class UpdateSiigoDto extends PartialType(CreateSiigoDto) {}
