import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export async function getTokens(
  jwtService: JwtService,
  configService: ConfigService,
  userId: number,
  email: string,
) {
  const payload = { sub: userId, email };

  const accessToken = await jwtService.signAsync(payload, {
    secret: configService.getOrThrow<string>('JWT_SECRET'),
    expiresIn: configService.get('JWT_EXPIRES_IN') || '1h',
  });

  const refreshToken = await jwtService.signAsync(payload, {
    secret: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    expiresIn: configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
  });

  return { accessToken, refreshToken };
}
