import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AtGuard } from '@common/guards/at.guard';
import { GetCurrentUserId } from '@common/decorators/get-current-user-id.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập hệ thống' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * CHỖ NÀY ĐÃ ĐƯỢC DỌN DẸP
   * Tôi đưa @UseGuards và @ApiBearerAuth trực tiếp vào hàm này
   * vì Register/Login không cần bảo mật.
   */
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token') // Phải khớp với tên trong swaggerConfig
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất' })
  logout(@GetCurrentUserId() userId: number) {
    return this.authService.logout(userId);
  }
}
