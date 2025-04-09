import { Otp } from './entities/otp.entity';
import { MoreThan, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class OtpRepository {
  constructor(
    @InjectRepository(Otp)
    private readonly repository: Repository<Otp>,
  ) {}

  async createOtp(email: string): Promise<Otp> {
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const otp = this.repository.create({
      email,
      code,
      expiresAt,
    });

    return this.repository.save(otp);
  }

  async validateOtp(email: string, code:     string): Promise<boolean> {
    const otp = await this.repository.findOne({
      where: {
        email,
        code,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (otp) {
      otp.used = true;
      await this.repository.save(otp);
      return true;
    }

    return false;
  }

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  }
}
