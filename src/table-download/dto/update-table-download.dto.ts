import { PartialType } from '@nestjs/mapped-types';
import { CreateTableDownloadDto } from './create-table-download.dto';

export class UpdateTableDownloadDto extends PartialType(CreateTableDownloadDto) {}
