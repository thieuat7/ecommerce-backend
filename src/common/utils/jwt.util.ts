import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Hàm tạo bộ đôi Access Token và Refresh Token
 * @param roles Danh sách các quyền của người dùng (Ví dụ: ['user', 'admin'])
 */
export async function getTokens(
  jwtService: JwtService,
  configService: ConfigService,
  userId: number,
  email: string,
  roles: string[],
) {
  // Payload của JWT sẽ chứa mảng các roles để các Guard sau này dễ dàng kiểm tra
  const payload = {
    sub: userId,
    email,
    roles,
  };

  // Sử dụng Promise.all để tạo cả 2 token cùng lúc, giúp tối ưu hiệu năng
  const [accessToken, refreshToken] = await Promise.all([
    jwtService.signAsync(payload, {
      secret: configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: configService.get('JWT_EXPIRES_IN') || '15m',
    }),
    jwtService.signAsync(payload, {
      secret: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    }),
  ]);

  return {
    accessToken,
    refreshToken,
  };
}
