import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { getTokens } from '@common/utils/jwt.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Đăng ký tài khoản
  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng!');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    // Tạo access + refresh token
    const { accessToken, refreshToken } = await getTokens(
      this.jwtService,
      this.configService,
      newUser.id,
      newUser.email,
    );

    // Lưu hash của refresh token để kiểm tra khi refresh
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.setCurrentRefreshToken(
      hashedRefreshToken,
      newUser.id,
    );

    return {
      message: 'Đăng ký tài khoản thành công',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // Đăng nhập
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng!');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng!');
    }

    const { accessToken, refreshToken } = await getTokens(
      this.jwtService,
      this.configService,
      user.id,
      user.email,
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.setCurrentRefreshToken(hashedRefreshToken, user.id);

    return {
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // Refresh access token bằng refresh token
  async refreshToken(userId: number, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.current_hashed_refresh_token) {
      throw new BadRequestException('Refresh token không hợp lệ');
    }

    const isTokenValid = await bcrypt.compare(
      refreshToken,
      user.current_hashed_refresh_token,
    );
    if (!isTokenValid) {
      throw new BadRequestException('Refresh token không hợp lệ');
    }

    const { accessToken, refreshToken: newRefreshToken } = await getTokens(
      this.jwtService,
      this.configService,
      user.id,
      user.email,
    );

    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.usersService.setCurrentRefreshToken(hashedRefreshToken, user.id);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
    };
  }

  // Logout: xóa refresh token
  async logout(userId: number) {
    await this.usersService.removeRefreshToken(userId);
    return { message: 'Đăng xuất thành công' };
  }
}
