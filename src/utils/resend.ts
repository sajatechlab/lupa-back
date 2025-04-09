import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ResendService {
  private resend: Resend;
  private contactEmail: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.contactEmail = this.configService.get<string>('RESEND_CONTACT_EMAIL');
  }

  async sendEmailVerification(email: string, code: string) {
    const template = this.getEmailTemplates(email, code);

    await this.resend.emails.send({
      from: this.contactEmail,
      to: email,
      subject: template.subject,
      html: template.html,
    });
  }
  private getEmailTemplates(email: string, code: string) {
    return {
      subject: 'Email Verification',
      html: `
        <h1>Email Verification</h1>
        <p>Your verification code is ${code}</p>
      </html>`,
    };
  }
}
