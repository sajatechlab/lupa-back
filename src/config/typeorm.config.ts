import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { User } from '../user/entities/user.entity';
import { Company } from '../company/entities/company.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceLine } from '../invoice/entities/invoice-line.entity';
import { SoftwareProvider } from '../software-provider/entities/software-provider.entity';

dotenv.config();

const configService = new ConfigService();

const dbConfig = {
      host: configService.get('DB_HOST'),
      port: parseInt(configService.get('DB_PORT') || '5432'),
      username: configService.get('DB_USERNAME'),
      password: configService.get('DB_PASSWORD'),
      database: configService.get('DB_NAME'),
    }

export default new DataSource({
  type: 'postgres',
  ...dbConfig,
  entities: [User, Company, Invoice, InvoiceLine, SoftwareProvider],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
});
