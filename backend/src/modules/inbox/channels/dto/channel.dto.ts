import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export const CHANNEL_PROVIDERS = [
  'whatsapp',
  'messenger',
  'instagram',
] as const;
export type ChannelProviderCode = (typeof CHANNEL_PROVIDERS)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ChannelAuthorizationDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  redirectState = '';
}

export class ChannelExchangeDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) code?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  userAccessToken?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(64) wabaId?: string;
}

export class ConnectChannelDto {
  @IsIn(CHANNEL_PROVIDERS) provider!: ChannelProviderCode;
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  providerAccountId!: string;
  /** Present when the asset was picked from a linking session. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) sessionId?: string;
  /** Present when the operator pastes a system-user or page token directly. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  accessToken?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  businessAccountId?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  displayName?: string;
  @IsOptional() @IsBoolean() subscribeWebhooks = true;
}

export class UpdateChannelDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  displayName?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  accessToken?: string;
}
