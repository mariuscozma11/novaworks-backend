import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private emailTokenRepo: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private resetTokenRepo: Repository<PasswordResetToken>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Generate a cryptographically secure token
   * @returns 64-character hex string (256 bits of entropy)
   */
  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash a token using SHA-256
   * @param token Plain token to hash
   * @returns Hashed token (64-character hex string)
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Timing-safe token comparison
   */
  private compareTokens(a: string, b: string): boolean {
    try {
      return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }

  /**
   * Generate email verification token
   * @param userId User ID
   * @returns Plain token (to be sent in email)
   */
  async generateEmailVerificationToken(userId: string): Promise<string> {
    // Invalidate any existing unused tokens for this user
    await this.emailTokenRepo.update({ userId, used: false }, { used: true });

    // Generate new token
    const plainToken = this.generateSecureToken();
    const hashedToken = this.hashToken(plainToken);

    // Set expiry to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Save to database
    const tokenRecord = this.emailTokenRepo.create({
      token: hashedToken,
      userId,
      expiresAt,
    });

    await this.emailTokenRepo.save(tokenRecord);

    // Return plain token (not hashed) to send in email
    return plainToken;
  }

  /**
   * Verify email verification token
   * @param plainToken Token from email link
   * @returns User if valid, throws error if invalid
   */
  async verifyEmailToken(plainToken: string): Promise<User> {
    const hashedToken = this.hashToken(plainToken);

    // Find token record
    const tokenRecord = await this.emailTokenRepo.findOne({
      where: { token: hashedToken, used: false },
      relations: ['user'],
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Check if expired
    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Token has expired. Please request a new one.');
    }

    // Mark token as used
    tokenRecord.used = true;
    await this.emailTokenRepo.save(tokenRecord);

    // Update user's email verification status
    await this.userRepo.update(tokenRecord.userId, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    return tokenRecord.user;
  }

  /**
   * Generate password reset token
   * @param userId User ID
   * @returns Plain token (to be sent in email)
   */
  async generatePasswordResetToken(userId: string): Promise<string> {
    // Invalidate any existing unused tokens for this user
    await this.resetTokenRepo.update({ userId, used: false }, { used: true });

    // Generate new token
    const plainToken = this.generateSecureToken();
    const hashedToken = this.hashToken(plainToken);

    // Set expiry to 30 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // Save to database
    const tokenRecord = this.resetTokenRepo.create({
      token: hashedToken,
      userId,
      expiresAt,
    });

    await this.resetTokenRepo.save(tokenRecord);

    // Return plain token (not hashed) to send in email
    return plainToken;
  }

  /**
   * Verify password reset token (doesn't mark as used yet)
   * @param plainToken Token from email link
   * @returns User if valid, throws error if invalid
   */
  async verifyPasswordResetToken(plainToken: string): Promise<User> {
    const hashedToken = this.hashToken(plainToken);

    // Find token record
    const tokenRecord = await this.resetTokenRepo.findOne({
      where: { token: hashedToken, used: false },
      relations: ['user'],
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Check if expired
    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Token has expired. Please request a new one.');
    }

    return tokenRecord.user;
  }

  /**
   * Mark password reset token as used (called after password is actually changed)
   * @param plainToken Token from email link
   */
  async markResetTokenAsUsed(plainToken: string): Promise<void> {
    const hashedToken = this.hashToken(plainToken);

    await this.resetTokenRepo.update(
      { token: hashedToken, used: false },
      { used: true, usedAt: new Date() },
    );
  }

  /**
   * Clean up expired tokens (to be called by cron job)
   */
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();

    await this.emailTokenRepo.delete({ expiresAt: LessThan(now) });
    await this.resetTokenRepo.delete({ expiresAt: LessThan(now) });
  }
}
