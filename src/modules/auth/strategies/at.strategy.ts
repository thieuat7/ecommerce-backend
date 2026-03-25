import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

type AccessTokenPayload = {
  sub: number;
  email: string;
};

@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    console.log('Strategy Secret:', configService.get('JWT_SECRET'));
    super({
      // 1. Lấy Token từ header Authorization dạng 'Bearer <token>'
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Sau khi giải mã thành công, payload của Token sẽ được đưa vào hàm này
  validate(payload: AccessTokenPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return { sub: payload.sub, email: payload.email };
  }
}
