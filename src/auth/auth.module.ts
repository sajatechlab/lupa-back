import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtGlobalAuthGuard } from './guards/jwt-global-auth.guard';
import { OtpModule } from 'src/otp/otp.module';
import { ResendService } from 'src/utils/resend';
import { OtpRepository } from 'src/otp/otp.repository';
@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    OtpModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtGlobalAuthGuard,
    ResendService,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtGlobalAuthGuard],
})
export class AuthModule {}
