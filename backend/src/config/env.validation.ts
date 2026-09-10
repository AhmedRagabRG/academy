import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

/**
 * Numeric properties MUST carry an explicit `: number` annotation, even when an
 * initializer already implies it. `emitDecoratorMetadata` derives `design:type`
 * from the annotation alone; with none it emits `Object`, and
 * `enableImplicitConversion` then leaves the value as the raw string dotenv
 * produced, so `@IsInt()` rejects it. The failure only appears once the variable
 * is actually set in `.env` — an unset variable falls back to the initializer,
 * which is already a number — so it hides through every test that omits it.
 */
class EnvironmentVariables {
  @IsIn(['development', 'test', 'production']) NODE_ENV!: string;
  @IsInt() @Min(1) PORT!: number;
  @IsString() @IsNotEmpty() DATABASE_URL!: string;
  @IsString() @IsNotEmpty() JWT_ACCESS_SECRET!: string;
  @IsString() @IsNotEmpty() JWT_REFRESH_SECRET!: string;
  @IsString() @IsNotEmpty() JWT_ACCESS_TTL!: string;
  @IsString() @IsNotEmpty() JWT_REFRESH_TTL!: string;
  @IsBooleanString() COOKIE_SECURE!: string;
  @IsIn(['lax', 'strict', 'none']) COOKIE_SAME_SITE!: string;
  @IsString() COOKIE_DOMAIN = '';
  @IsString() @IsNotEmpty() CORS_ORIGINS!: string;
  @IsString() @IsNotEmpty() UPLOAD_DIR!: string;
  @IsInt() @Min(1) UPLOAD_MAX_BYTES!: number;
  @IsString() @IsNotEmpty() FILES_PUBLIC_BASE_URL!: string;
  @IsEmail() SEED_ADMIN_EMAIL!: string;
  @IsString() @IsNotEmpty() SEED_ADMIN_PASSWORD!: string;
  @IsBooleanString() SWAGGER_ENABLED!: string;
  @IsInt() @Min(8) PASSWORD_MIN_LENGTH!: number;
  @IsString() META_APP_SECRET = '';
  @IsString() META_WEBHOOK_VERIFY_TOKEN = '';
  @IsString() META_GRAPH_VERSION = 'v25.0';
  @IsString() META_WHATSAPP_ACCESS_TOKEN = '';
  @IsString() META_WHATSAPP_PHONE_NUMBER_ID = '';
  @IsString() META_WHATSAPP_BUSINESS_ACCOUNT_ID = '';
  @IsString() META_MESSENGER_PAGE_ACCESS_TOKEN = '';
  @IsString() META_MESSENGER_PAGE_ID = '';
  @IsString() META_INSTAGRAM_ACCESS_TOKEN = '';
  @IsString() META_INSTAGRAM_ACCOUNT_ID = '';
  @IsBooleanString() CAMPAIGN_DISPATCH_ENABLED = 'true';
  @IsInt() @Min(1000) CAMPAIGN_TICK_MS: number = 5000;
  @IsInt() @Min(1) CAMPAIGN_MAX_PER_TICK: number = 100;
  @IsString() REDIS_URL = '';
  @IsString() OPENAI_API_KEY = '';
  @IsString() OPENAI_CHAT_MODEL = 'gpt-4o';
  @IsString() OPENAI_EMBEDDING_MODEL = 'text-embedding-3-large';
  @IsInt() @Min(1) OPENAI_EMBEDDING_DIMENSIONS: number = 1536;
  @IsInt() @Min(1) OPENAI_REQUEST_TIMEOUT_MS: number = 30000;
  @IsInt() @Min(0) OPENAI_MAX_RETRIES: number = 2;
  @IsBooleanString() AI_ENABLED = 'false';
  @IsBooleanString() AI_QUEUE_ENABLED = 'false';
  @IsBooleanString() AI_RESUME_SWEEP_ENABLED = 'true';
  @IsInt() @Min(1000) AI_RESUME_SWEEP_MS: number = 30000;
}

export function validate(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length)
    throw new Error(
      `Invalid environment variables: ${errors.map((error) => error.property).join(', ')}`,
    );
  return config;
}
