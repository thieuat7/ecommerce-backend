import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AtGuard } from '@common/guards/at.guard';

import { GetCurrentUserId } from '@common/decorators/get-current-user-id.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * ĐĂNG XUẤT
   * 1. @UseGuards(AtGuard): Đảm bảo chỉ người có Token hợp lệ mới được gọi.
   * 2. @GetCurrentUserId(): Lấy trực tiếp ID từ Token, không dùng 'any', không dùng 'req'.
   * 3. @HttpCode(HttpStatus.OK): Trả về code 200 thay vì 201 (mặc định của @Post).
   */
  @UseGuards(AtGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetCurrentUserId() userId: number) {
    return this.authService.logout(userId);
  }
}
