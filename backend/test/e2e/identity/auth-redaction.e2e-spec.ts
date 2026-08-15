import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('authentication secret redaction', () => {
  it('redacts cookies, authorization, passwords, hashes, and tokens from structured logs', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app.module.ts'),
      'utf8',
    );
    for (const secret of [
      'req.headers.cookie',
      'req.headers.authorization',
      '*.password',
      '*.passwordHash',
      '*.token',
    ]) {
      expect(source).toContain(`'${secret}'`);
    }
  });

  it('never declares credential fields in public response DTOs', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/modules/identity/auth/dto/auth-response.dto.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/password|hash|accessToken|refreshToken/);
  });
});
