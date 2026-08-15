import '../../load-env';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
import { RefreshTokenRepository } from '../../../src/core/auth/refresh-token.repository';
import { TokenService } from '../../../src/core/auth/token.service';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

describe('refresh compare-and-rotate', () => {
  afterAll(() => prisma.$disconnect());

  it('allows exactly one concurrent use and rejects replay of the old hash', async () => {
    const account = await prisma.account.findFirstOrThrow({
      where: { status: 'ACTIVE' },
    });
    const repository = new RefreshTokenRepository(prisma as never);
    const tokens = new TokenService(
      new JwtService(),
      new ConfigService({
        jwt: {
          accessSecret: process.env.JWT_ACCESS_SECRET,
          refreshSecret: process.env.JWT_REFRESH_SECRET,
          accessTtl: process.env.JWT_ACCESS_TTL,
          refreshTtl: process.env.JWT_REFRESH_TTL,
        },
      }),
      repository,
    );
    const issued = await tokens.issueRefreshToken(account.id);
    const results = await Promise.allSettled([
      tokens.rotateRefreshToken(issued.token),
      tokens.rotateRefreshToken(issued.token),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    await expect(tokens.rotateRefreshToken(issued.token)).rejects.toMatchObject(
      { code: 'UNAUTHORIZED' },
    );
    await repository.revoke(issued.id);
  });
});
