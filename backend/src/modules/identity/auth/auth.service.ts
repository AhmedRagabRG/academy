import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AccountRepository } from '../../../core/auth/account.repository';
import { CookieService } from '../../../core/auth/cookie.service';
import { PasswordService } from '../../../core/auth/password.service';
import { TokenService } from '../../../core/auth/token.service';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  AccountInactiveException,
  InvalidCredentialsException,
  UnauthenticatedException,
} from '../../../core/exceptions';
import { REFRESH_COOKIE } from '../../../shared/constants';
import { ACCESS_COOKIE } from '../../../shared/constants';
import { mapEmployeeContext } from '../mappers/identity.mapper';
import { deriveSessionMetadata } from '../sessions/session-metadata';
import { IdentityEventName } from '../events/identity.events';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class IdentityAuthService {
  private dummyHash?: Promise<string>;
  constructor(
    private readonly accounts: AccountRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly cookies: CookieService,
    private readonly events: DomainEventBus,
  ) {}

  private emit(
    name: string,
    actorId: string | null,
    targetId: string,
    payload: Record<string, unknown>,
  ): void {
    this.events.emit({
      name,
      occurredAt: new Date().toISOString(),
      actor: actorId ? { accountId: actorId } : null,
      target: { type: 'session', id: targetId },
      operation: name,
      payload,
    });
  }

  async login(dto: LoginDto, request: Request, response: Response) {
    const account = await this.accounts.findByEmail(dto.email);
    this.dummyHash ??= this.passwords.hash('Invalid1!Invalid1!');
    const valid = await this.passwords.verify(
      dto.password,
      account?.passwordHash ?? (await this.dummyHash),
    );
    if (!account || !valid) {
      this.emit(IdentityEventName.LoginFailed, null, 'unknown', {
        email: dto.email.toLowerCase(),
        reason: 'invalid_credentials',
      });
      throw new InvalidCredentialsException();
    }
    if (
      account.status !== 'ACTIVE' ||
      !account.roles.some(({ role }) => role.status === 'ACTIVE')
    ) {
      this.emit(IdentityEventName.LoginFailed, account.id, account.id, {
        email: dto.email.toLowerCase(),
        reason: 'inactive_account',
      });
      throw new AccountInactiveException();
    }
    const refresh = await this.tokens.issueRefreshToken(
      account.id,
      deriveSessionMetadata(request),
    );
    const access = await this.tokens.issueAccessToken(account.id, refresh.id);
    this.cookies.setCredentialCookies(response, access, refresh.token);
    this.emit(IdentityEventName.Login, account.id, refresh.id, {
      sessionId: refresh.id,
    });
    return mapEmployeeContext(account, new Date().toISOString());
  }

  async restore(
    accountId: string,
    authenticatedAt: string,
    request: Request,
    response: Response,
  ) {
    if (!accountId) {
      if (request.cookies?.[ACCESS_COOKIE] || request.cookies?.[REFRESH_COOKIE])
        this.cookies.clearCredentialCookies(response);
      return null;
    }
    const account = await this.accounts.findActiveById(accountId);
    if (!account) this.cookies.clearCredentialCookies(response);
    return account ? mapEmployeeContext(account, authenticatedAt) : null;
  }

  async refresh(request: Request, response: Response): Promise<null> {
    const token = request.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      this.cookies.clearCredentialCookies(response);
      throw new UnauthenticatedException();
    }
    try {
      const rotated = await this.tokens.rotateRefreshToken(token);
      const account = await this.accounts.findActiveById(rotated.accountId);
      if (!account) throw new UnauthenticatedException();
      const access = await this.tokens.issueAccessToken(
        account.id,
        rotated.sessionId,
      );
      this.cookies.setCredentialCookies(response, access, rotated.refreshToken);
      return null;
    } catch (error) {
      this.cookies.clearCredentialCookies(response);
      throw error;
    }
  }

  async logout(
    accountId: string,
    sessionId: string,
    response: Response,
  ): Promise<null> {
    if (sessionId) await this.tokens.revokeRefreshToken(sessionId);
    this.cookies.clearCredentialCookies(response);
    if (sessionId)
      this.emit(IdentityEventName.Logout, accountId, sessionId, { sessionId });
    return null;
  }
}
