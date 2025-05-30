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
const isLocal = configService.get('NODE_ENV') === 'development';

const dbConfig = isLocal
  ? {
      host: configService.get('DB_HOST'),
      port: parseInt(configService.get('DB_PORT') || '5432'),
      username: configService.get('DB_USERNAME'),
      password: configService.get('DB_PASSWORD'),
      database: configService.get('DB_NAME'),
    }
  : {
      url: configService.get('DATABASE_URL'),
      ssl: {
        rejectUnauthorized: false,
      },
    };

// Validate required configuration
if (isLocal) {
  const requiredFields = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME'];
  const missingFields = requiredFields.filter(
    (field) => !configService.get(field),
  );
  if (missingFields.length > 0) {
    throw new Error(
      `Missing required database configuration: ${missingFields.join(', ')}`,
    );
  }
} else if (!configService.get('DATABASE_URL')) {
  throw new Error('DATABASE_URL is required for non-local environment');
}

export default new DataSource({
  type: 'postgres',
  ...dbConfig,
  entities: [User, Company, Invoice, InvoiceLine, SoftwareProvider],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
});
