import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { EntityStatus } from '../../../../prisma/generated/client';

export const uppercaseOrganizationStatus = ({
  value: raw,
}: TransformFnParams): unknown => {
  const value: unknown = raw;
  return typeof value === 'string' ? value.toUpperCase() : value;
};

export class OrganizationIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}

export class ExpectedVersionDto {
  @ApiProperty({ minimum: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class ExpectedAcademicYearVersionDto {
  @ApiProperty({ minimum: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedAcademicYearVersion!: number;
}

export class OrganizationStatusDto extends ExpectedVersionDto {
  @ApiProperty({ enum: ['active', 'inactive', 'archived'] })
  @Transform(uppercaseOrganizationStatus)
  @IsIn([EntityStatus.ACTIVE, EntityStatus.INACTIVE, EntityStatus.ARCHIVED])
  status!: EntityStatus;
}

export class OrganizationListDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'archived', 'all'] })
  @IsOptional()
  @Transform(uppercaseOrganizationStatus)
  @IsIn([
    EntityStatus.ACTIVE,
    EntityStatus.INACTIVE,
    EntityStatus.ARCHIVED,
    'ALL',
  ])
  status?: EntityStatus | 'ALL';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
