import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Query,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { GetUser } from '../auth/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { CreateAuthDianUrlDto } from './dto/create-auth-dian-url.dto';
import { InvoiceType } from 'src/invoice/enums/invoice-type.enum';
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createCompanyDto: CreateCompanyDto, @GetUser() user: User) {
    console.log('create company', user, createCompanyDto);

    return this.companyService.create(createCompanyDto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@GetUser() user: User) {
    return this.companyService.findAll();
  }
  @Get('by-user')
  @UseGuards(JwtAuthGuard)
  async findAllByUser(@GetUser() user: User) {
    const companies = await this.companyService.findAllByUser(user.id);

    return companies;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companyService.remove(id);
  }

  @Post('auth-url')
  async createAuthDianUrl(@Body() dto: CreateAuthDianUrlDto) {
    return this.companyService.createAuthDianUrl(dto);
  }

  @Get(':companyId/third-party-companies')
  @UseGuards(JwtAuthGuard)
  async getThirdPartyCompanies(@Param('companyId') companyId: string) {
    return this.companyService.getThirdPartyCompaniesByCompany(companyId);
  }

  @Get(':id/invoices')
  @UseGuards(JwtAuthGuard)
  async getCompanyInvocies(
    @Param('id') id: string,
    @Query('type') type: InvoiceType,
  ) {
    return this.companyService.getCompanyInvoices(id, type);
  }

  @Get(':id/invoices/metrics')
  @UseGuards(JwtAuthGuard)
  async getCompanyInvoicesMetrics(@Param('id') id: string) {
    return this.companyService.getCompanyInvoicesMetrics(id);
  }
}
