import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { InvoiceModule } from './invoice/invoice.module';
import { AuthModule } from './auth/auth.module';
import { TableDownloadModule } from './table-download/table-download.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtGlobalAuthGuard } from './auth/guards/jwt-global-auth.guard';
import { AttachmentsModule } from './attachments/attachments.module';
import { SiigoModule } from './siigo/siigo.module';
import { OtpModule } from './otp/otp.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isLocal = configService.get('NODE_ENV') === 'development';

        if (isLocal) {
          return {
            type: 'postgres',
            host: configService.get('DB_HOST'),
            port: configService.get('DB_PORT'),
            username: configService.get('DB_USERNAME'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_NAME'),
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            autoLoadEntities: true,
            synchronize: true,
            migrations: [__dirname + '/migrations/*{.ts,.js}'],
            migrationsRun: configService.get('NODE_ENV') !== 'development',
          };
        } else {
          return {
            type: 'postgres',
            url: configService.get('DATABASE_URL'),
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            autoLoadEntities: true,
            synchronize: true,
            migrations: [__dirname + '/migrations/*{.ts,.js}'],
            migrationsRun: configService.get('NODE_ENV') !== 'development',
            ssl: {
              rejectUnauthorized: false, // Required for some cloud providers
            },
          };
        }
      },
    }),
    UserModule,
    CompanyModule,
    InvoiceModule,
    AuthModule,
    TableDownloadModule,
    AttachmentsModule,
    SiigoModule,
    OtpModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtGlobalAuthGuard,
    },
  ],
})
export class AppModule {}
