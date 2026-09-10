import 'reflect-metadata';
import { validate } from '../../../src/config/env.validation';

/**
 * The Phase 1 startup test only proved the app boots with the optional variables
 * ABSENT, where each falls back to a class initializer that is already the right
 * type. Setting them in `.env` is the case that broke: dotenv yields strings, and
 * a property with no `: number` annotation emits `design:type = Object`, so
 * `enableImplicitConversion` never coerces it. These tests set every optional
 * variable explicitly, which is the configuration an operator actually deploys.
 */
const required: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
  COOKIE_SECURE: 'false',
  COOKIE_SAME_SITE: 'lax',
  CORS_ORIGINS: 'http://localhost:3000',
  UPLOAD_DIR: 'uploads-test',
  UPLOAD_MAX_BYTES: '5242880',
  FILES_PUBLIC_BASE_URL: '/files',
  SEED_ADMIN_EMAIL: 'admin@example.com',
  SEED_ADMIN_PASSWORD: 'test-password-only',
  SWAGGER_ENABLED: 'false',
  PASSWORD_MIN_LENGTH: '12',
};

/** Every optional variable, as dotenv would supply it: a string. */
const optionalAsStrings: Record<string, string> = {
  META_APP_SECRET: 'secret',
  META_WEBHOOK_VERIFY_TOKEN: 'token',
  META_GRAPH_VERSION: 'v25.0',
  CAMPAIGN_DISPATCH_ENABLED: 'true',
  CAMPAIGN_TICK_MS: '5000',
  CAMPAIGN_MAX_PER_TICK: '100',
  REDIS_URL: 'redis://127.0.0.1:6379',
  OPENAI_API_KEY: 'sk-test',
  OPENAI_CHAT_MODEL: 'gpt-4o',
  OPENAI_EMBEDDING_MODEL: 'text-embedding-3-large',
  OPENAI_EMBEDDING_DIMENSIONS: '1536',
  OPENAI_REQUEST_TIMEOUT_MS: '30000',
  OPENAI_MAX_RETRIES: '2',
  AI_ENABLED: 'true',
  AI_QUEUE_ENABLED: 'true',
  AI_RESUME_SWEEP_ENABLED: 'true',
  AI_RESUME_SWEEP_MS: '30000',
};

describe('environment validation', () => {
  it('accepts the required set with every optional variable omitted', () => {
    expect(() => validate({ ...required })).not.toThrow();
  });

  it('accepts every optional variable supplied as a string, as dotenv gives them', () => {
    expect(() => validate({ ...required, ...optionalAsStrings })).not.toThrow();
  });

  it.each(
    Object.entries(optionalAsStrings).filter(([, value]) =>
      /^\d+$/.test(value),
    ),
  )('coerces numeric %s="%s" instead of rejecting it', (key, value) => {
    expect(() => validate({ ...required, [key]: value })).not.toThrow();
  });

  it('still rejects a genuinely invalid numeric value', () => {
    expect(() =>
      validate({ ...required, OPENAI_MAX_RETRIES: 'not-a-number' }),
    ).toThrow(/OPENAI_MAX_RETRIES/);
  });

  it('still rejects a missing required variable', () => {
    const withoutPort = { ...required };
    delete withoutPort.PORT;
    expect(() => validate(withoutPort)).toThrow(/PORT/);
  });
});
