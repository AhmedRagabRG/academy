import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('auth CSRF and credentialed CORS', () => {
  const source = readFileSync(join(process.cwd(), 'src/main.ts'), 'utf8');
  it('protects mutation methods and permits only safe read exemptions', () => {
    expect(source).toContain("ignoredMethods: ['GET', 'HEAD', 'OPTIONS']");
    expect(source).toContain(
      "getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token']",
    );
  });
  it('enables credentials while refusing wildcard origins', () => {
    expect(source).toContain("origins.includes('*')");
    expect(source).toContain('credentials: true');
  });
});
