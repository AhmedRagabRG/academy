import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../shared/constants';
@Injectable()
export class CookieService {
  constructor(private readonly config: ConfigService) {}

  private ttlMilliseconds(value: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
    if (!match) throw new Error(`Invalid JWT TTL: ${value}`);
    const amount = Number(match[1]);
    const unit = match[2] as 's' | 'm' | 'h' | 'd';
    const multiplier: Record<typeof unit, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return amount * multiplier[unit];
  }

  private options(path = '/'): CookieOptions {
    const domain = this.config.get<string>('cookie.domain');
    return {
      httpOnly: true,
      secure: this.config.getOrThrow('cookie.secure'),
      sameSite: this.config.getOrThrow('cookie.sameSite'),
      path,
      ...(domain ? { domain } : {}),
    };
  }
  setCredentialCookies(res: Response, access: string, refresh: string): void {
    res.cookie(ACCESS_COOKIE, access, {
      ...this.options(),
      maxAge: this.ttlMilliseconds(
        this.config.getOrThrow<string>('jwt.accessTtl'),
      ),
    });
    res.cookie(REFRESH_COOKIE, refresh, {
      ...this.options('/api/v1/auth/refresh'),
      maxAge: this.ttlMilliseconds(
        this.config.getOrThrow<string>('jwt.refreshTtl'),
      ),
    });
  }
  clearCredentialCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, this.options());
    res.clearCookie(REFRESH_COOKIE, this.options('/api/v1/auth/refresh'));
  }
}
