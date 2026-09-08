export interface AppConfig {
  nodeEnv: string;
  port: number;
}
export interface DatabaseConfig {
  url: string;
}
export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
}
export interface CookieConfig {
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  domain?: string;
}
export interface CorsConfig {
  origins: string[];
}
export interface UploadConfig {
  directory: string;
  maxBytes: number;
  publicBaseUrl: string;
}
export interface SwaggerConfig {
  enabled: boolean;
}
export interface SeedConfig {
  adminEmail: string;
  adminPassword: string;
}
export interface PasswordPolicyConfig {
  minLength: number;
}
export interface MetaConfig {
  appSecret: string;
  verifyToken: string;
  graphVersion: string;
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  messengerPageAccessToken: string;
  messengerPageId: string;
  instagramAccessToken: string;
  instagramAccountId: string;
}
export interface CampaignsConfig {
  /** Turned off in tests and in workers that must not send. */
  dispatchEnabled: boolean;
  tickMs: number;
  /** Hard ceiling per tick, whatever a single campaign's throttle asks for. */
  maxPerTick: number;
}
