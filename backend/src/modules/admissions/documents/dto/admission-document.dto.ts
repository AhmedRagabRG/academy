import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class AdmissionDocumentRouteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}

export class AdmissionDocumentItemRouteDto extends AdmissionDocumentRouteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  documentId!: string;
}

export class AdmissionDocumentUploadDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  requirementId!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey!: string;

  @ApiProperty({ minimum: 1 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class AdmissionDocumentReplaceDto {
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey!: string;

  @ApiProperty({ minimum: 1 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class WithdrawAdmissionDocumentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  documentVersionId!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export enum AdmissionDocumentDecisionDtoValue {
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export class VerifyAdmissionDocumentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  documentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  versionId!: string;

  @ApiProperty({ enum: AdmissionDocumentDecisionDtoValue })
  @IsEnum(AdmissionDocumentDecisionDtoValue)
  decision!: AdmissionDocumentDecisionDtoValue;

  @ApiPropertyOptional({ maxLength: 500 })
  @ValidateIf(
    (value: VerifyAdmissionDocumentDto) =>
      value.decision === AdmissionDocumentDecisionDtoValue.REJECTED,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class RefreshAdmissionDocumentPolicyDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
