import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { CallerContext } from '../../shared/types/caller-context';
export const CurrentCaller = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CallerContext =>
    context.switchToHttp().getRequest<Request & { caller: CallerContext }>()
      .caller,
);
