import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EntityStatus } from '../../../../../prisma/generated/client';
import {
  ExpectedVersionDto,
  OrganizationListDto,
  OrganizationStatusDto,
} from '../../types/organization.dto';

export class LookupGroupCodeParamDto {
  @IsString() @MinLength(2) @MaxLength(60) groupCode!: string;
}
export class LookupValueParamDto extends LookupGroupCodeParamDto {
  @IsUUID() id!: string;
}
export class LookupValueListDto extends OrganizationListDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentValueId?: string;
  @ApiPropertyOptional({ enum: ['sortOrder', 'name', 'code', 'updatedAt'] })
  @IsOptional()
  @IsIn(['sortOrder', 'name', 'code', 'updatedAt'])
  sort?: 'sortOrder' | 'name' | 'code' | 'updatedAt';
}
export class CreateLookupValueDto {
  @ApiProperty({ example: 'حضوري' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;
  @ApiProperty({ example: 'in-person' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  code!: string;
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
  @IsInt() @Min(0) sortOrder!: number;
  @IsOptional() @IsUUID() parentValueId?: string;
  @IsOptional() @IsIn(Object.values(EntityStatus)) status?: EntityStatus;
}
export class UpdateLookupValueDto extends ExpectedVersionDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsUUID() parentValueId?: string;
}
export class LookupValueStatusDto extends OrganizationStatusDto {}
export class ReorderLookupValueItemDto extends ExpectedVersionDto {
  @IsUUID() id!: string;
  @IsInt() @Min(0) sortOrder!: number;
}
export class ReorderLookupValuesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderLookupValueItemDto)
  items!: ReorderLookupValueItemDto[];
  @IsInt() @Min(1) expectedGroupVersion!: number;
}
export class LookupValueResponseDto {
  id!: string;
  lookupGroupId!: string;
  groupCode!: string;
  parentValueId!: string | null;
  name!: string;
  code!: string;
  description!: string | null;
  sortOrder!: number;
  status!: string;
  version!: number;
  permissions!: Record<string, boolean>;
}
