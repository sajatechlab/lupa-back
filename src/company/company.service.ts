import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyRepository } from './company.repository';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UserRepository } from 'src/user/user.repository';
import { CreateAuthDianUrlDto } from './dto/create-auth-dian-url.dto';
import puppeteer from 'puppeteer';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as RUA from 'random-useragent';
import { InvoiceRepository } from 'src/invoice/invoice.repository';
import { InvoiceType } from 'src/invoice/enums/invoice-type.enum';
import { InvoiceMetrics } from 'src/invoice/invoice.service';
@Injectable()
export class CompanyService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly userRepository: UserRepository,
    private readonly invoiceRepository: InvoiceRepository,
  ) {}

  async create(createCompanyDto: CreateCompanyDto, userId: number) {
    const existingCompany = await this.companyRepository.findByNit(
      createCompanyDto.nit,
    );
    console.log('existingCompany', existingCompany);
    if (existingCompany) {
      throw new BadRequestException('Company already exists');
    }
    console.log('existingCompany', existingCompany);

    const company = await this.companyRepository.create(createCompanyDto);
    console.log('company', company);

    await this.userRepository.update(userId, company);
    return company;
  }

  findAll() {
    return this.companyRepository.findAll();
  }

  findAllByUser(userId: number) {
    return this.companyRepository.findAllByUser(userId);
  }

  async findOne(id: string) {
    const company = await this.companyRepository.findOne(id);
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    await this.findOne(id); // Verify existence
    return this.companyRepository.update(id, updateCompanyDto);
  }

  async remove(id: string) {
    await this.findOne(id); // Verify existence
    return this.companyRepository.remove(id);
  }
  async getThirdPartyCompaniesByCompany(companyId: string) {
    return this.companyRepository.getThirdPartyCompaniesByCompany(companyId);
  }
  async createAuthDianUrl(dto: CreateAuthDianUrlDto) {
    const { nit, legalRepDocumentType, legalRepDocumentNumber } = dto;
    let documentType = legalRepDocumentType;
    let documentNumber = legalRepDocumentNumber;
    if (documentType && documentNumber) {
      await this.companyRepository.updateAuthInfo(dto);
    } else {
      const company = await this.companyRepository.findByNit(dto.nit);
      if (!company) {
        throw new NotFoundException('Company not found');
      }

      documentNumber = company.legalRepDocumentNumber;
      documentType = company.legalRepDocumentType;
    }

    // try {
    //   const browser = await puppeteer.launch({
    //     headless: false,
    //     defaultViewport: null,
    //     args: [
    //       '--start-maximized',
    //       '--no-sandbox',
    //       '--disable-setuid-sandbox',
    //       '--disable-web-security',
    //       '--disable-features=IsolateOrigins,site-per-process',
    //     ],
    //   });
    //   const page = await browser.newPage();
    //   // Load cookies from a file
    //   const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));
    //   await page.setCookie(...cookies);
    //   // Set a longer default timeout
    //   page.setDefaultNavigationTimeout(60000);

    //   // Go to login page
    //   await page.goto('https://catalogo-vpfe.dian.gov.co/User/CompanyLogin', {
    //     waitUntil: 'networkidle0',
    //   });

    //   console.log('Please solve the Cloudflare challenge manually...');
    //   // Wait for navigation after Cloudflare

    //   // Click on "Representante Legal" option
    //   await page.waitForSelector('#legalRepresentative');
    //   await page.click('#legalRepresentative');

    //   //await page.waitForNavigation({ waitUntil: 'networkidle0' });

    //   // Wait for form to be visible and fill it
    //   await page.waitForSelector('select[name="IdentificationType"]');
    //   await page.$eval(
    //     'select[name="IdentificationType"]',
    //     (select, value) => {
    //       const options = Array.from(select.options);
    //       const optionToSelect = options.find(
    //         (option) => option.text === value,
    //       );
    //       if (optionToSelect) {
    //         select.value = optionToSelect.value;
    //         select.dispatchEvent(new Event('change'));
    //       }
    //     },
    //     'Pasaporte',
    //   );

    //   await page.waitForSelector('input[name="UserCode"]');
    //   await page.type('input[name="UserCode"]', documentNumber, { delay: 100 });

    //   await page.waitForSelector('input[name="CompanyCode"]');
    //   await page.type('input[name="CompanyCode"]', nit, { delay: 100 });

    //   // Wait for and click the submit button
    //   await page.waitForSelector('button.btn.btn-primary');
    //   await page.evaluate(() => {
    //     const button = document.querySelector(
    //       'button.btn.btn-primary',
    //     ) as HTMLButtonElement;
    //     if (button) button.click();
    //   });

    //   // Get the auth token from the response
    //   const response = await page.waitForResponse((response) =>
    //     response.url().includes('/User/AuthToken'),
    //   );

    //   await browser.close();
    // } catch (error) {
    //   console.error('Error in createAuthDianUrl:', error);
    //   throw error;
    // }
    try {
      const browser = await chromium.launch({ headless: false });
      const context = await browser.newContext({
        userAgent: RUA.getRandom(),
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();

      // Load cookies from a file
      const cookies = [
        {
          name: 'cookie_name',
          value: 'cookie_value',
          domain: '.domain.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as 'Lax' | 'Strict' | 'None',
        },
      ];
      await page.context().addCookies(cookies);
      // Set a longer default timeout
      page.setDefaultNavigationTimeout(60000);

      // Go to login page
      await page.goto('https://catalogo-vpfe.dian.gov.co/User/CompanyLogin');

      console.log('Please solve the Cloudflare challenge manually...');
      // Wait until the user has solved the Cloudflare challenge manually
      await page.waitForTimeout(3000); // You can adjust this timeout based on how long it takes you

      // Click on "Representante Legal" option
      await page.waitForSelector('#legalRepresentative');
      await page.click('#legalRepresentative');
      await page.waitForTimeout(2000);

      // Wait for form to be visible and fill it
      await page.waitForSelector('select[name="IdentificationType"]');
      await page.selectOption('select[name="IdentificationType"]', 'Pasaporte');
      await page.waitForTimeout(2000);

      await page.waitForSelector('input[name="UserCode"]');
      await page.type('input[name="UserCode"]', documentNumber, { delay: 200 }); // Slower typing
      await page.waitForTimeout(2000);

      await page.waitForSelector('input[name="CompanyCode"]');
      await page.type('input[name="CompanyCode"]', nit, { delay: 200 }); // Slower typing
      await page.waitForTimeout(2000);

      console.log(
        'Please solve the CAPTCHA manually and press Enter when ready...',
      );
      await new Promise((resolve) => process.stdin.once('data', resolve));
      await page.waitForTimeout(2000); // Small delay after user confirmation

      // Wait for and click the submit button
      await page.waitForSelector('button.btn.btn-primary');
      await page.click('button.btn.btn-primary');

      // Wait for the auth token response after form submission
      const response = await page.waitForResponse((response) =>
        response.url().includes('/User/AuthToken'),
      );

      // Optionally, log the response body if you need to extract details
      const authToken = await response.json();
      console.log('Auth token:', authToken);

      await browser.close();
    } catch (error) {
      console.error('Error in createAuthDianUrl:', error);
      throw error;
    }
  }
  async getCompanyInvoices(id: string, type: InvoiceType) {
    return this.invoiceRepository.findByCompanyId(id, type);
  }
  async getCompanyInvoicesMetrics(id: string): Promise<InvoiceMetrics> {
    return this.invoiceRepository.getCompanyMetrics(id);
  }
}
