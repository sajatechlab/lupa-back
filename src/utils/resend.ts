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

  async sendContactUsEmail(contactUsDto: any) {
    const template = this.getContactUsEmailTemplate(contactUsDto);

    await this.resend.emails.send({
      from: this.contactEmail,
      to: this.contactEmail,
      subject: template.subject,
      html: template.html,
    });
  }
  private getContactUsEmailTemplate(contactUsDto: any) {
    return {
      subject: 'Contact Us Form Submission',
      html: `
        <h1>Contact Us Form Submission</h1>
        <p>Name: ${contactUsDto.name}</p>
        <p>Email: ${contactUsDto.email}</p>
        <p>Message: ${contactUsDto.message}</p>
        <p>Company: ${contactUsDto.company}</p>
        <p>Phone: ${contactUsDto.phone}</p>
      </html>`,
    };
  }
}
