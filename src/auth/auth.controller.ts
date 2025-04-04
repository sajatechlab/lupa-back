import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  Get,
  Request,
  UseFilters,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { AuthGuard } from '@nestjs/passport';
import { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthExceptionFilter } from './auth.exception';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './decorators/public.decorator';
//import { GoogleOAuthGuard } from './google-oauth.guard';

@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}
  private getCookieOptions(): CookieOptions {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: isProduction ? '.lupa-ia.com' : undefined,
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 1 day,
      partitioned: true, // Add this for Safari 17+ (Privacy Preserving Ad Attribution)
    } as CookieOptions; // Type assertion to handle 'partitioned'
  }
  @Public()
  @Post('signup')
  async signUp(
    @Body() signUpDto: SignUpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    console.log('signup', signUpDto);

    const signUp = await this.authService.singUp(signUpDto);
    response.cookie('jwt', signUp.accessToken, this.getCookieOptions());
    return { message: 'Successfully signed up' };
  }

  @Public()
  @Post('login')
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const signIn = await this.authService.signIn(signInDto);
    response.cookie('jwt', signIn.accessToken, this.getCookieOptions());
    return { message: 'Successfully signed in' };
  }

  @Post('test')
  @UseGuards(AuthGuard())
  test(@Req() req) {}

  @Get('session')
  @UseGuards(JwtAuthGuard)
  session(@Req() req) {
    return req.user;
  }

  @Post('logout')
  @UseGuards(AuthGuard())
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('jwt', this.getCookieOptions());
    return { message: 'Successfully logged out' };
  }

  // @Get('google')
  // @UseGuards(GoogleOAuthGuard)
  // async googleAuth(@Request() req) {}

  // @Get('google-redirect')
  // @UseGuards(GoogleOAuthGuard)
  // async googleAuthRedirect(
  //   @Request() req,
  //   @Res({ passthrough: true }) response: Response
  // ) {
  //   const signIn = await this.authService.signInGoogle(req.user)
  //   response.cookie('jwt', signIn.accessToken, {
  //     httpOnly: true,
  //     secure:
  //       this.configService.get('NODE_ENV') === 'production' ||
  //       this.configService.get('NODE_ENV') === 'testing', // Production or Testing
  //     sameSite:
  //       this.configService.get('NODE_ENV') === 'production' ||
  //       this.configService.get('NODE_ENV') === 'testing'
  //         ? 'none'
  //         : 'lax',
  //   })
  //   response.redirect(this.configService.get('FRONTEND_URL') + '/companies')
  // }
}
