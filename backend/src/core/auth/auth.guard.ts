import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ACCESS_COOKIE } from '../../shared/constants';
import {
  EMPTY_CALLER_CONTEXT,
  type CallerContext,
} from '../../shared/types/caller-context';
import { AccountRepository } from './account.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { TokenService } from './token.service';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly accounts: AccountRepository,
    private readonly sessions: RefreshTokenRepository,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { caller: CallerContext }>();
    request.caller = EMPTY_CALLER_CONTEXT;
    const token = request.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) return true;
    try {
      const claims = await this.tokens.verifyAccessToken(token);
      const account = await this.accounts.findActiveById(claims.sub);
      if (!account) return true;
      const roles = account.roles
        .filter(({ role }) => role.status === 'ACTIVE')
        .map(({ role }) => ({
          id: role.id,
          code: role.code,
          displayName: role.displayName,
        }));
      const permissionKeys = [
        ...new Set(
          account.roles.flatMap(({ role }) =>
            role.status === 'ACTIVE'
              ? role.permissions
                  .filter(({ permission }) => permission.active)
                  .map(({ permission }) => permission.key)
              : [],
          ),
        ),
      ];
      if (!(await this.tokens.isSessionActive(claims.sid, account.id)))
        return true;
      request.caller = {
        accountId: account.id,
        sessionId: claims.sid,
        displayName: account.displayName,
        email: account.email,
        roles,
        permissionKeys,
        organizationWide: account.organizationWide,
        authenticatedAt: new Date((claims.iat ?? 0) * 1000).toISOString(),
      };
      await this.sessions.touchActivity(
        claims.sid,
        account.id,
        new Date(Date.now() - 60_000),
      );
    } catch {
      return true;
    }
    return true;
  }
}
