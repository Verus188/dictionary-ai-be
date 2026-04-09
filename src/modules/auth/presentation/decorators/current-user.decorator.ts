import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequestUser } from '../../application/types/authenticated-request-user.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedRequestUser => {
    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedRequestUser;
    }>();

    return request.user;
  },
);
