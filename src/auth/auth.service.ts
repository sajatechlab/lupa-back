import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SignUpDto } from './dto/signup.dto';
import { UserRepository } from 'src/user/user.repository';
import * as bcrypt from 'bcrypt';
import { SignInDto } from './dto/signin.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './jwt-payload.interface';
import { hashPassword, comparePasswords } from 'src/utils/password.util';
import { OtpRepository } from 'src/otp/otp.repository';
import { ResendService } from 'src/utils/resend';
import { ContactUsDto } from './dto/contact-us.dto';
@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private readonly otpRepository: OtpRepository,
    private readonly resendService: ResendService,
  ) {}

  async singUp(signUpDto: SignUpDto): Promise<{ accessToken: string }> {
    const { password, email, fullName } = signUpDto;
    const existingUser = await this.userRepository.findUserByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }
    const hashedPassword = await hashPassword(password);

    await this.userRepository.createUser({
      name: fullName,
      email,
      password: hashedPassword,
    });

    const payload: JwtPayload = { email };
    const accessToken: string = await this.jwtService.sign(payload);
    return { accessToken };
  }

  async signIn(
    singInDto: SignInDto,
  ): Promise<{ accessToken: string; isVerified: boolean }> {
    const { email, password } = singInDto;
    console.log('signIn', email, password);

    const user = await this.userRepository.findUserByEmail(email);
    console.log('user', user);
    if (user && (await comparePasswords(password, user.password))) {
      const payload: JwtPayload = { email };
      const accessToken: string = await this.jwtService.sign(payload);
      return { accessToken, isVerified: user.isVerified };
    } else {
      console.log('error');
      throw new UnauthorizedException('Please check your login credentials');
    }
  }

  async sendEmailVerification(email: string) {
    const otp = await this.otpRepository.createOtp(email);

    await this.resendService.sendEmailVerification(email, otp.code);

    return { message: 'Verification code sent to email' };
  }

  async verifyEmail(email: string, code: string) {
    const isValid = await this.otpRepository.validateOtp(email, code);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }
    await this.userRepository.updateUser(email, {
      isVerified: true,
      verifiedAt: new Date(),
    });
    return { message: 'Email verified successfully' };
  }

  // async singUpGoogle(googleUser: any): Promise<{ accessToken: string }> {
  //   const { email } = googleUser;
  //   // const password =
  //   // const salt = await bcrypt.genSalt()
  //   // const hashedPassword = await bcrypt.hash(password, salt)

  //   const user = await this.usersRepository.createUser({
  //     ...googleUser,
  //     //password: hashedPassword,
  //     role: Role.USER,
  //     fromGoogle: true,
  //   });

  //   const payload: JwtPayload = { email };
  //   const accessToken: string = await this.jwtService.sign(payload);

  //   return { accessToken };
  // }

  // async signInGoogle(googleUser: any): Promise<{ accessToken: string }> {
  //   if (!googleUser) {
  //     throw new BadRequestException('Unauthenticated');
  //   }
  //   const { email } = googleUser;
  //   const user = await this.usersRepository.findUserByEmail(email);
  //   if (!user) {
  //     return this.singUpGoogle(googleUser);
  //   }

  //   if (user.fromGoogle) {
  //     const payload: JwtPayload = { email };
  //     const accessToken: string = await this.jwtService.sign(payload);
  //     return { accessToken };
  //   } else {
  //     throw new UnauthorizedException('Please check your login credentials');
  //   }
  // }
  async contactUs(contactUsDto: ContactUsDto): Promise<{ message: string }> {
    console.log('contactUsDto', contactUsDto);

    await this.resendService.sendContactUsEmail(contactUsDto);
    return { message: 'Message sent successfully' };
  }
}
