import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { User } from '../users/entities/user.entity';
import { render } from '@react-email/render';
import { VerificationEmail } from './templates/verification-email';
import { PasswordResetEmail } from './templates/password-reset-email';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured. Email sending will fail.');
    }
    this.resend = new Resend(apiKey);
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'noreply@yourdomain.com';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173';
  }

  async sendVerificationEmail(user: User, token: string): Promise<boolean> {
    try {
      const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;

      const html = await render(
        VerificationEmail({
          firstName: user.firstName,
          verificationLink: verificationUrl,
        }),
      );

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: user.email,
        subject: 'Verify your email address',
        html,
      });

      if (error) {
        this.logger.error(
          `Failed to send verification email to ${user.email}`,
          error,
        );
        return false;
      }

      this.logger.log(`Verification email sent to ${user.email} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending verification email to ${user.email}`,
        error,
      );
      return false;
    }
  }

  async sendPasswordResetEmail(user: User, token: string): Promise<boolean> {
    try {
      const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

      const html = await render(
        PasswordResetEmail({
          firstName: user.firstName,
          resetLink: resetUrl,
        }),
      );

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: user.email,
        subject: 'Reset your password',
        html,
      });

      if (error) {
        this.logger.error(
          `Failed to send password reset email to ${user.email}`,
          error,
        );
        return false;
      }

      this.logger.log(`Password reset email sent to ${user.email} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending password reset email to ${user.email}`,
        error,
      );
      return false;
    }
  }
}
