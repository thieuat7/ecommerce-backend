import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GetCurrentUserId } from '@common/decorators/get-current-user-id.decorator';
import { UseAuth } from '@common/decorators/use-auth.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Đăng ký tài khoản mới
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Đăng nhập
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập hệ thống' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Đăng xuất (Yêu cầu xác thực)
  @UseAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất' })
  logout(@GetCurrentUserId() userId: number) {
    return this.authService.logout(userId);
  }
}
