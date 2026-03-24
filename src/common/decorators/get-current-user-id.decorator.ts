import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '@modules/auth/types/jwt-payload.type';

interface RequestWithUser extends Request {
  user: JwtPayload;
}

export const GetCurrentUserId = createParamDecorator(
  (_: undefined, context: ExecutionContext): number => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.sub;
  },
);
