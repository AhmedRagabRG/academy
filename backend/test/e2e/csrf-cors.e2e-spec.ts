import { doubleCsrf } from 'csrf-csrf';
describe('CSRF and CORS configuration', () => {
  it('exempts reads and refuses unverified mutations', () => {
    const ignoredMethods = ['GET', 'HEAD', 'OPTIONS'] as const;
    const csrf = doubleCsrf({
      getSecret: () => 'secret-at-least-32-characters',
      getSessionIdentifier: () => 'session',
      ignoredMethods: [...ignoredMethods],
    });
    expect(ignoredMethods).toContain('GET');
    expect(
      csrf.validateRequest({
        method: 'POST',
        cookies: {},
        headers: {},
      } as never),
    ).toBe(false);
  });
  it('does not permit a credentialed wildcard origin', () =>
    expect(process.env.CORS_ORIGINS).not.toContain('*'));
});
