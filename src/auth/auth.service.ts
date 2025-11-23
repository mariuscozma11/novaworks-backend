import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { TokenService } from './services/token.service';
import { EmailService } from '../email/email.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private tokenService: TokenService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);

    // Generate verification token
    const token = await this.tokenService.generateEmailVerificationToken(user.id);

    // Send verification email
    const emailSent = await this.emailService.sendVerificationEmail(user as User, token);

    if (!emailSent) {
      this.logger.warn(`Failed to send verification email to ${user.email}`);
    }

    return {
      user,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in. Check your inbox for the verification link.',
      );
    }

    const { password, ...result } = user;
    const access_token = this.generateToken(result as User);
    return { user: result, access_token };
  }

  async validateUser(payload: JwtPayload) {
    return this.usersService.findById(payload.sub);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    // Get user with password
    const user = await this.usersService.findByIdWithPassword(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await this.usersService.validatePassword(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check if new password is different
    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Update password
    await this.usersService.updatePassword(userId, changePasswordDto.newPassword);

    return { message: 'Password changed successfully' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists
      return {
        message: 'If that email is registered, a verification link has been sent.',
      };
    }

    if (user.emailVerified) {
      return {
        message: 'Email is already verified. You can log in.',
      };
    }

    // Generate new token
    const token = await this.tokenService.generateEmailVerificationToken(user.id);

    // Send email
    const emailSent = await this.emailService.sendVerificationEmail(user, token);

    if (!emailSent) {
      this.logger.error(`Failed to resend verification email to ${email}`);
      throw new BadRequestException('Failed to send verification email. Please try again later.');
    }

    return {
      message: 'If that email is registered, a verification link has been sent.',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.tokenService.verifyEmailToken(token);

    this.logger.log(`Email verified for user: ${user.email}`);

    return {
      success: true,
      message: 'Email verified successfully! You can now log in.',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return {
        message: 'If that email exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const token = await this.tokenService.generatePasswordResetToken(user.id);

    // Send email
    const emailSent = await this.emailService.sendPasswordResetEmail(user, token);

    if (!emailSent) {
      this.logger.error(`Failed to send password reset email to ${email}`);
      throw new BadRequestException('Failed to send reset email. Please try again later.');
    }

    return {
      message: 'If that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // Verify token and get user
    const user = await this.tokenService.verifyPasswordResetToken(token);

    // Update password
    await this.usersService.updatePassword(user.id, newPassword);

    // Mark token as used
    await this.tokenService.markResetTokenAsUsed(token);

    this.logger.log(`Password reset for user: ${user.email}`);

    return {
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    };
  }

  private generateToken(user: Partial<User>): string {
    const payload: JwtPayload = {
      sub: user.id!,
      email: user.email!,
      role: user.role!,
    };
    return this.jwtService.sign(payload);
  }
}
