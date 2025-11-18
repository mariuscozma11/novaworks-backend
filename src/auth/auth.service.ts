import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User, UserRole } from '../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    const access_token = this.generateToken(user as User);
    return { user, access_token };
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

  private generateToken(user: Partial<User>): string {
    const payload: JwtPayload = {
      sub: user.id!,
      email: user.email!,
      role: user.role!,
    };
    return this.jwtService.sign(payload);
  }
}
