import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IdentityEventName } from '../../../src/modules/identity/events/identity.events';

describe('identity logging and audit readiness', () => {
  it('covers every operation family with stable event names', () => {
    expect(Object.values(IdentityEventName)).toEqual(
      expect.arrayContaining([
        'identity.login',
        'identity.login-failed',
        'identity.logout',
        'identity.session-revoked',
        'identity.employee-created',
        'identity.employee-updated',
        'identity.employee-status-changed',
        'identity.password-reset',
        'identity.password-changed',
        'identity.role-created',
        'identity.role-updated',
        'identity.role-permissions-changed',
      ]),
    );
  });
  it('uses request correlation and broad credential redaction', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app.module.ts'),
      'utf8',
    );
    expect(source).toContain("req.headers['x-request-id']");
    expect(source).toContain("'req.headers.cookie'");
    expect(source).toContain("'*.passwordHash'");
  });
});
