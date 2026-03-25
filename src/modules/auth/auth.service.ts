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

  // 1. Đăng ký tài khoản (Đã loại bỏ Token)
  async register(dto: RegisterDto) {
    // Kiểm tra email tồn tại
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng!');
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Lưu người dùng mới
    const newUser = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    return {
      message: 'Đăng ký tài khoản thành công. Vui lòng đăng nhập.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    };
  }

  // 2. Đăng nhập
  async login(dto: LoginDto) {
    // sử dụng findByEmailWithPassword để lấy trường password
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng!');
    }

    // So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng!');
    }

    // Tạo access + refresh token

    const { accessToken, refreshToken } = await getTokens(
      this.jwtService,
      this.configService,
      user.id,
      user.email,
    );

    // Lưu hash của refresh token
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

  // 3. Làm mới Token
  async refreshToken(userId: number, refreshToken: string) {
    // SỬ DỤNG: findByIdWithPassword để lấy trường current_hashed_refresh_token
    const user = await this.usersService.findByIdWithPassword(userId);

    if (!user || !user.current_hashed_refresh_token) {
      throw new BadRequestException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    // Kiểm tra tính hợp lệ của refresh token gửi lên so với hash trong DB
    const isTokenValid = await bcrypt.compare(
      refreshToken,
      user.current_hashed_refresh_token,
    );

    if (!isTokenValid) {
      throw new BadRequestException('Refresh token không hợp lệ');
    }

    // Tạo bộ token mới
    const { accessToken, refreshToken: newRefreshToken } = await getTokens(
      this.jwtService,
      this.configService,
      user.id,
      user.email,
    );

    // Cập nhật lại hash mới vào DB
    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.usersService.setCurrentRefreshToken(hashedRefreshToken, user.id);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
    };
  }

  // 4. Đăng xuất
  async logout(userId: number) {
    await this.usersService.removeRefreshToken(userId);
    return { message: 'Đăng xuất thành công' };
  }
}
