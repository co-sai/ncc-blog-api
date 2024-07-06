import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const mailUser = this.configService.get<string>('MAIL_USER');
    const mailPass = this.configService.get<string>('MAIL_PASS');
    const mailService = this.configService.get<string>('MAIL_SERVICE');

    this.transporter = nodemailer.createTransport({
      service: mailService,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    });
  }

  async sendMail(route: string, template: string, reset_token: string, to: string, subject: string, text: string) {
    const resetLink = `${this.configService.get<string>('BASE_URL')}/${route}/reset-password?token=${reset_token}`;
    const imageSrc = 'https://avatars.githubusercontent.com/u/172569677?s=200&v=4';
    const htmlTemplatePath = path.join(process.cwd(), 'src', 'templates', template);
    let htmlContent = fs.readFileSync(htmlTemplatePath, 'utf8');

    htmlContent = htmlContent.replace('{{resetLink}}', resetLink);
    htmlContent = htmlContent.replace('{{year}}', new Date().getFullYear().toString());
    htmlContent = htmlContent.replace('{{imageSrc}}', imageSrc);

    const mailOptions = {
      from: `${this.configService.get<string>('PROJECT_NAME')} <${this.configService.get<string>('MAIL_USER')}>`,
      to,
      subject,
      text,
      html: htmlContent,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.response}`);
      return info;
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`);
      throw error;
    }
  }

  async sendVerificationMail(email_verify_token: string, to: string, subject: string, text: string) {
    const verificationLink = `http://localhost:3000/auth/user/email-verification?token=${email_verify_token}`;
    const htmlTemplatePath = path.join(process.cwd(), 'src', 'templates', 'email-verification.template.html');
    let htmlContent = fs.readFileSync(htmlTemplatePath, 'utf8');

    htmlContent = htmlContent.replace('{{VerificationLink}}', verificationLink);
    htmlContent = htmlContent.replace('{{year}}', new Date().getFullYear().toString());

    const mailOptions = {
      from: `${this.configService.get<string>('PROJECT_NAME')} <${this.configService.get<string>('MAIL_USER')}>`,
      to,
      subject,
      text,
      html: htmlContent,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.response}`);
      return info;
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`);
      throw error;
    }
  }

  async sendLoginCredentialMail(email: string, password : string, to: string, subject: string, text: string) {
    const htmlTemplatePath = path.join(process.cwd(), 'src', 'templates', 'login-credential.template.html');
    let htmlContent = fs.readFileSync(htmlTemplatePath, 'utf8');

    htmlContent = htmlContent.replace('{{email}}', email);
    htmlContent = htmlContent.replace('{{password}}', password);

    htmlContent = htmlContent.replace('{{year}}', new Date().getFullYear().toString());

    const mailOptions = {
      from: `${this.configService.get<string>('PROJECT_NAME')} <${this.configService.get<string>('MAIL_USER')}>`,
      to,
      subject,
      text,
      html: htmlContent,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.response}`);
      return info;
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`);
      throw error;
    }
  }
}

