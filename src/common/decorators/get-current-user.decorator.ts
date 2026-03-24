import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayloadWithRt } from '@modules/auth/types/jwt-payload.type';

interface RequestWithUserRt extends Request {
  user: JwtPayloadWithRt;
}

export const GetCurrentUser = createParamDecorator(
  (data: keyof JwtPayloadWithRt | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithUserRt>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
