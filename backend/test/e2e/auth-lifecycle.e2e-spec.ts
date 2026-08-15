import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../../src/core/auth/password.service';
import { RefreshTokenRepository } from '../../src/core/auth/refresh-token.repository';
import { TokenService } from '../../src/core/auth/token.service';
describe('credential lifecycle', () => {
  it('hashes credentials, issues/verifies access and revocable refresh tokens', async () => {
    const password = new PasswordService();
    const digest = await password.hash('correct');
    await expect(password.verify('correct', digest)).resolves.toBe(true);
    let record: {
      id: string;
      tokenHash: string;
      expiresAt: Date;
      revokedAt: Date | null;
    } | null = null;
    const repository = {
      create: (
        id: string,
        _accountId: string,
        tokenHash: string,
        expiresAt: Date,
      ) =>
        Promise.resolve(
          (record = { id, tokenHash, expiresAt, revokedAt: null }),
        ),
      findValidById: (id: string) =>
        Promise.resolve(record?.id === id && !record.revokedAt ? record : null),
      revoke: () => {
        if (record) record.revokedAt = new Date();
        return Promise.resolve();
      },
    } as unknown as RefreshTokenRepository;
    const config = new ConfigService({
      jwt: {
        accessSecret: 'access-secret-at-least-32-characters',
        refreshSecret: 'refresh-secret-at-least-32-characters',
        accessTtl: '15m',
        refreshTtl: '7d',
      },
    });
    const tokens = new TokenService(new JwtService(), config, repository);
    const account = {
      id: 'account',
      email: 'a@example.com',
      role: { id: 'role', code: 'role', permissionKeys: [] },
    };
    const access = await tokens.issueAccessToken(account);
    await expect(tokens.verifyAccessToken(access)).resolves.toMatchObject({
      sub: 'account',
      type: 'access',
    });
    const refresh = await tokens.issueRefreshToken('account');
    await expect(
      tokens.verifyRefreshToken(refresh.token),
    ).resolves.toMatchObject({ jti: refresh.id });
    await tokens.revokeRefreshToken(refresh.id);
    await expect(
      tokens.verifyRefreshToken(refresh.token),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
