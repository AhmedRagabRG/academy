import { validate } from '../../src/config/env.validation';
const valid: Record<string, unknown> = {
  NODE_ENV: 'test',
  PORT: 3001,
  DATABASE_URL: 'postgresql://localhost/test',
  JWT_ACCESS_SECRET: 'access',
  JWT_REFRESH_SECRET: 'refresh',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
  COOKIE_SECURE: 'false',
  COOKIE_SAME_SITE: 'lax',
  COOKIE_DOMAIN: '',
  CORS_ORIGINS: 'http://localhost:3001',
  UPLOAD_DIR: 'uploads-test',
  UPLOAD_MAX_BYTES: 1000,
  FILES_PUBLIC_BASE_URL: '/files',
  SEED_ADMIN_EMAIL: 'admin@example.com',
  SEED_ADMIN_PASSWORD: 'password',
  SWAGGER_ENABLED: 'false',
};
describe('configuration startup gate', () => {
  it.each(Object.keys(valid).filter((key) => key !== 'COOKIE_DOMAIN'))(
    'names missing required variable %s',
    (key) => {
      const candidate = { ...valid };
      delete candidate[key];
      expect(() => validate(candidate)).toThrow(key);
    },
  );
});
