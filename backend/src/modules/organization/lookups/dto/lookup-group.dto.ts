import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EntityStatus } from '../../../../../prisma/generated/client';
import {
  ExpectedVersionDto,
  OrganizationListDto,
  OrganizationStatusDto,
} from '../../types/organization.dto';

export class LookupGroupListDto extends OrganizationListDto {
  @ApiPropertyOptional({ enum: ['code', 'name', 'updatedAt'] })
  @IsOptional()
  @IsIn(['code', 'name', 'updatedAt'])
  sort?: 'code' | 'name' | 'updatedAt';
}
export class CreateLookupGroupDto {
  @ApiProperty({ example: 'qualifications' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  code!: string;
  @ApiProperty({ example: 'المؤهلات' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentGroupId?: string;
  @ApiPropertyOptional({ enum: EntityStatus })
  @IsOptional()
  @IsIn(Object.values(EntityStatus))
  status?: EntityStatus;
}
export class UpdateLookupGroupDto extends ExpectedVersionDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?: string;
  @IsOptional() @IsUUID() parentGroupId?: string;
}
export class LookupGroupStatusDto extends OrganizationStatusDto {}
export class LookupGroupResponseDto {
  id!: string;
  organizationId!: string;
  code!: string;
  name!: string;
  parentGroupId!: string | null;
  status!: string;
  version!: number;
  valueCount?: number;
  childGroupCount?: number;
  permissions!: Record<string, boolean>;
}
