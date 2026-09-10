import { registerAs } from '@nestjs/config';
import type {
  AiConfig,
  AppConfig,
  CampaignsConfig,
  CookieConfig,
  CorsConfig,
  DatabaseConfig,
  JwtConfig,
  MetaConfig,
  OpenAiConfig,
  PasswordPolicyConfig,
  RedisConfig,
  SeedConfig,
  SwaggerConfig,
  UploadConfig,
} from './config.types';

const bool = (value: string | undefined): boolean => value === 'true';
export const appConfig = registerAs('app', (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV!,
  port: Number(process.env.PORT),
}));
export const databaseConfig = registerAs('database', (): DatabaseConfig => ({
  url: process.env.DATABASE_URL!,
}));
export const jwtConfig = registerAs('jwt', (): JwtConfig => ({
  accessSecret: process.env.JWT_ACCESS_SECRET!,
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
  accessTtl: process.env.JWT_ACCESS_TTL!,
  refreshTtl: process.env.JWT_REFRESH_TTL!,
}));
export const cookieConfig = registerAs('cookie', (): CookieConfig => ({
  secure: bool(process.env.COOKIE_SECURE),
  sameSite: process.env.COOKIE_SAME_SITE as CookieConfig['sameSite'],
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
}));
export const corsConfig = registerAs('cors', (): CorsConfig => ({
  origins: process.env.CORS_ORIGINS!.split(',').map((item) => item.trim()),
}));
export const uploadConfig = registerAs('upload', (): UploadConfig => ({
  directory: process.env.UPLOAD_DIR!,
  maxBytes: Number(process.env.UPLOAD_MAX_BYTES),
  publicBaseUrl: process.env.FILES_PUBLIC_BASE_URL!,
}));
export const swaggerConfig = registerAs('swagger', (): SwaggerConfig => ({
  enabled: bool(process.env.SWAGGER_ENABLED),
}));
export const seedConfig = registerAs('seed', (): SeedConfig => ({
  adminEmail: process.env.SEED_ADMIN_EMAIL!,
  adminPassword: process.env.SEED_ADMIN_PASSWORD!,
}));
export const passwordPolicyConfig = registerAs(
  'passwordPolicy',
  (): PasswordPolicyConfig => ({
    minLength: Number(process.env.PASSWORD_MIN_LENGTH),
  }),
);
export const metaConfig = registerAs('meta', (): MetaConfig => ({
  appSecret: process.env.META_APP_SECRET ?? '',
  verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN ?? '',
  graphVersion: process.env.META_GRAPH_VERSION ?? 'v25.0',
  whatsappAccessToken: process.env.META_WHATSAPP_ACCESS_TOKEN ?? '',
  whatsappPhoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID ?? '',
  whatsappBusinessAccountId:
    process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID ?? '',
  messengerPageAccessToken: process.env.META_MESSENGER_PAGE_ACCESS_TOKEN ?? '',
  messengerPageId: process.env.META_MESSENGER_PAGE_ID ?? '',
  instagramAccessToken: process.env.META_INSTAGRAM_ACCESS_TOKEN ?? '',
  instagramAccountId: process.env.META_INSTAGRAM_ACCOUNT_ID ?? '',
}));
export const campaignsConfig = registerAs('campaigns', (): CampaignsConfig => ({
  dispatchEnabled: process.env.CAMPAIGN_DISPATCH_ENABLED !== 'false',
  tickMs: Number(process.env.CAMPAIGN_TICK_MS ?? 5000),
  maxPerTick: Number(process.env.CAMPAIGN_MAX_PER_TICK ?? 100),
}));
export const redisConfig = registerAs('redis', (): RedisConfig => ({
  url: process.env.REDIS_URL ?? '',
}));
export const openaiConfig = registerAs('openai', (): OpenAiConfig => ({
  apiKey: process.env.OPENAI_API_KEY ?? '',
  chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o',
  embeddingModel:
    process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-large',
  // HNSW indexes support at most 2,000 dimensions, so request native truncation.
  embeddingDimensions: Number(process.env.OPENAI_EMBEDDING_DIMENSIONS ?? 1536),
  requestTimeoutMs: Number(process.env.OPENAI_REQUEST_TIMEOUT_MS ?? 30000),
  maxRetries: Number(process.env.OPENAI_MAX_RETRIES ?? 2),
}));
export const aiConfig = registerAs('ai', (): AiConfig => ({
  enabled: process.env.AI_ENABLED === 'true',
  queueEnabled: process.env.AI_QUEUE_ENABLED === 'true',
}));
export const configuration = [
  appConfig,
  databaseConfig,
  jwtConfig,
  cookieConfig,
  corsConfig,
  uploadConfig,
  swaggerConfig,
  seedConfig,
  passwordPolicyConfig,
  metaConfig,
  campaignsConfig,
  redisConfig,
  openaiConfig,
  aiConfig,
];
