import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { CallerContext } from '../../shared/types/caller-context';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { ForbiddenException, UnauthenticatedException } from '../exceptions';
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const caller = context
      .switchToHttp()
      .getRequest<Request & { caller: CallerContext }>().caller;
    if (!caller?.accountId) throw new UnauthenticatedException();
    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const permissionKeys =
      caller.permissionKeys ?? caller.role?.permissionKeys ?? [];
    if (!required.every((key) => permissionKeys.includes(key)))
      throw new ForbiddenException();
    return true;
  }
}
