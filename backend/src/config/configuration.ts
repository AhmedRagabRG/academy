import { registerAs } from '@nestjs/config';
import type {
  AppConfig,
  ChannelSecretsConfig,
  CookieConfig,
  CorsConfig,
  DatabaseConfig,
  JwtConfig,
  CampaignsConfig,
  MetaConfig,
  PasswordPolicyConfig,
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
  appId: process.env.META_APP_ID ?? '',
  appSecret: process.env.META_APP_SECRET ?? '',
  verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN ?? '',
  graphVersion: process.env.META_GRAPH_VERSION ?? 'v25.0',
  redirectUri: process.env.META_OAUTH_REDIRECT_URI ?? '',
  whatsappAccessToken: process.env.META_WHATSAPP_ACCESS_TOKEN ?? '',
  whatsappPhoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID ?? '',
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
export const channelSecretsConfig = registerAs(
  'channelSecrets',
  (): ChannelSecretsConfig => ({
    encryptionKey:
      process.env.CHANNEL_TOKEN_ENCRYPTION_KEY ??
      process.env.JWT_ACCESS_SECRET!,
  }),
);
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
  channelSecretsConfig,
];
