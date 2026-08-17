import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestIdentity {
  orgId: string;
  userId?: string;
  papel?: string;
  authType: 'api_key' | 'jwt';
  scopes?: string[];
}

export const CurrentIdentity = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestIdentity => {
    const req = ctx.switchToHttp().getRequest();
    return req.identity;
  },
);

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.identity?.orgId;
  },
);