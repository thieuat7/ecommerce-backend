import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Kiểm tra xem email đã tồn tại hay chưa
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng!');
    }

    // 2. Hash mật khẩu trước khi lưu vào database
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltOrRounds);

    // 3. Tạo người dùng mới với mật khẩu đã được hash
    const newUser = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    // 4. Tạo payload cho JWT (chứa thông tin cơ bản của user)
    const payload = {
      sub: newUser.id,
      email: newUser.email,
    };

    // 5. Ký và tạo access token
    const accessToken = (await this.jwtService.signAsync(payload)) as string;
    

    // 6. Trả về kết quả
    return {
      message: 'Đăng ký tài khoản thành công',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      access_token: accessToken,
    };
  }
}
