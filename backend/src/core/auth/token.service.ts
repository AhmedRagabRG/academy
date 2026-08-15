import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import { UnauthenticatedException } from '../exceptions';
import {
  RefreshTokenRepository,
  type SessionMetadata,
} from './refresh-token.repository';

export interface AccessTokenClaims {
  sub: string;
  sid: string;
  type: 'access';
  iat?: number;
  exp?: number;
}
export interface RefreshTokenClaims {
  sub: string;
  jti: string;
  rti: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  private ttl(key: string): JwtSignOptions['expiresIn'] {
    return this.config.getOrThrow<string>(key) as JwtSignOptions['expiresIn'];
  }
  private digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  issueAccessToken(
    account: string | { id: string },
    sessionId = '',
  ): Promise<string> {
    const accountId = typeof account === 'string' ? account : account.id;
    return this.jwt.signAsync(
      { sub: accountId, sid: sessionId, type: 'access' },
      {
        secret: this.config.getOrThrow('jwt.accessSecret'),
        expiresIn: this.ttl('jwt.accessTtl'),
      },
    );
  }

  async issueRefreshToken(
    accountId: string,
    metadata: SessionMetadata = {
      device: 'Unknown device',
      browser: 'Unknown browser',
      ipAddress: 'unknown',
    },
  ): Promise<{ token: string; id: string }> {
    const id = randomUUID();
    const token = await this.signRefresh(accountId, id);
    const claims = this.jwt.decode<RefreshTokenClaims>(token);
    await this.refreshTokens.create(
      id,
      accountId,
      this.digest(token),
      new Date((claims.exp ?? 0) * 1000),
      metadata,
    );
    return { token, id };
  }

  private signRefresh(accountId: string, id: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: accountId, jti: id, rti: randomUUID(), type: 'refresh' },
      {
        secret: this.config.getOrThrow('jwt.refreshSecret'),
        expiresIn: this.ttl('jwt.refreshTtl'),
      },
    );
  }

  verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    return this.jwt.verifyAsync(token, {
      secret: this.config.getOrThrow('jwt.accessSecret'),
    });
  }

  async rotateRefreshToken(token: string): Promise<{
    accountId: string;
    sessionId: string;
    refreshToken: string;
  }> {
    const claims = await this.verifyRefreshToken(token);
    const refreshToken = await this.signRefresh(claims.sub, claims.jti);
    const nextClaims = this.jwt.decode<RefreshTokenClaims>(refreshToken);
    const rotated = await this.refreshTokens.rotate(
      claims.jti,
      this.digest(token),
      this.digest(refreshToken),
      new Date((nextClaims.exp ?? 0) * 1000),
    );
    if (!rotated) throw new UnauthenticatedException();
    return { accountId: claims.sub, sessionId: claims.jti, refreshToken };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
    try {
      const claims = await this.jwt.verifyAsync<RefreshTokenClaims>(token, {
        secret: this.config.getOrThrow('jwt.refreshSecret'),
      });
      if (claims.type !== 'refresh') throw new UnauthenticatedException();
      const record = await this.refreshTokens.findValidById(
        claims.jti,
        claims.sub,
      );
      if (!record || record.tokenHash !== this.digest(token))
        throw new UnauthenticatedException();
      return claims;
    } catch {
      throw new UnauthenticatedException();
    }
  }

  isSessionActive(sessionId: string, accountId: string): Promise<boolean> {
    return this.refreshTokens
      .findValidById(sessionId, accountId)
      .then((session) => Boolean(session));
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.refreshTokens.revoke(id);
  }
}
