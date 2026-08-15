import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ExpectedVersionDto } from '../../types/organization.dto';

export class OrganizationAssetDto {
  @IsUUID() id!: string;
  @IsString() @MinLength(1) fileName!: string;
  @IsString() @MinLength(1) originalName!: string;
  @Matches(/^(image|application)\//) mimeType!: string;
  @IsInt() @Min(1) size!: number;
  @IsUrl({ require_protocol: true, protocols: ['https'] }) url!: string;
}
export class OrganizationContactDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @Matches(/^(EMAIL|PHONE)$/) type!: 'EMAIL' | 'PHONE';
  @IsString() @MinLength(1) @MaxLength(100) label!: string;
  @IsString() @MinLength(3) @MaxLength(254) value!: string;
  @IsBoolean() isPrimary!: boolean;
  @IsInt() @Min(0) sortOrder!: number;
}
export class OrganizationSocialLinkDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @MinLength(2) @MaxLength(50) platform!: string;
  @IsUrl({ require_protocol: true, protocols: ['https'] }) url!: string;
  @IsInt() @Min(0) sortOrder!: number;
}
export class UpdateOrganizationProfileDto extends ExpectedVersionDto {
  @ApiPropertyOptional({ type: OrganizationAssetDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationAssetDto)
  logo?: OrganizationAssetDto | null;
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationAssetDto)
  favicon?: OrganizationAssetDto | null;
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationAssetDto)
  cover?: OrganizationAssetDto | null;
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  website?: string | null;
  @IsOptional() @IsString() @MaxLength(500) address?: string | null;
  @IsOptional() @IsObject() workingHours?: Record<string, string>;
  @IsOptional()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OrganizationContactDto)
  contacts?: OrganizationContactDto[];
  @IsOptional()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OrganizationSocialLinkDto)
  socialLinks?: OrganizationSocialLinkDto[];
}
export class OrganizationProfileResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  organizationId!: string;
  name!: string;
  code!: string;
  logo!: OrganizationAssetDto | null;
  favicon!: OrganizationAssetDto | null;
  cover!: OrganizationAssetDto | null;
  website!: string | null;
  address!: string | null;
  workingHours!: Record<string, string>;
  contacts!: OrganizationContactDto[];
  socialLinks!: OrganizationSocialLinkDto[];
  version!: number;
}
