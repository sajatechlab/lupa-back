import { Controller, Post, Body } from '@nestjs/common';
import { TableDownloadService } from './table-download.service';

@Controller('table-download')
export class TableDownloadController {
  constructor(private readonly tableDownloadService: TableDownloadService) {}

  @Post()
  async downloadAndTabulate(@Body() params: any) {
    console.log('prueba');

    const {
      authUrl,
      startDate,
      endDate,
      downloadPath,
      recibidos,
      enviados,
      nit,
    } = params;
    return await this.tableDownloadService.authenticateTabulateAndDownload(
      authUrl,
      startDate,
      endDate,
      recibidos,
      enviados,
      nit,
    );
  }
}
