import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { InvoiceModule } from './invoice/invoice.module';
import { AuthModule } from './auth/auth.module';
import { TableDownloadModule } from './table-download/table-download.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        autoLoadEntities: true,
        synchronize: true, //configService.get('NODE_ENV') !== 'production',
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: configService.get('NODE_ENV') !== 'development',
      }),
    }),
    UserModule,
    CompanyModule,
    InvoiceModule,
    AuthModule,
    TableDownloadModule,
  ],
})
export class AppModule {}
