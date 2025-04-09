import { Injectable, Inject } from '@nestjs/common';
import { CreateOtpDto } from './dto/create-otp.dto';
import { UpdateOtpDto } from './dto/update-otp.dto';
import { OtpRepository } from './otp.repository';
import { Otp } from './entities/otp.entity';

@Injectable()
export class OtpService {
  constructor(private readonly otpRepository: OtpRepository) {}

  create(createOtpDto: CreateOtpDto) {
    return 'This action adds a new otp';
  }

  findAll() {
    return `This action returns all otp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} otp`;
  }

  update(id: number, updateOtpDto: UpdateOtpDto) {
    return `This action updates a #${id} otp`;
  }

  remove(id: number) {
    return `This action removes a #${id} otp`;
  }

  async createOtp(email: string): Promise<Otp> {
    return this.otpRepository.createOtp(email);
  }

  async validateOtp(email: string, code: string): Promise<boolean> {
    return this.otpRepository.validateOtp(email, code);
  }
}
