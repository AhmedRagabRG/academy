import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EntityStatus } from '../../../../../prisma/generated/client';
import {
  OrganizationListDto,
  OrganizationStatusDto,
  ExpectedVersionDto,
  uppercaseOrganizationStatus,
} from '../../types/organization.dto';
export class DepartmentListDto extends OrganizationListDto {
  @IsOptional() @IsIn(['name', 'code', 'updatedAt']) sort?:
    'name' | 'code' | 'updatedAt';
}
export class CreateDepartmentDto {
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsString() @MinLength(2) @MaxLength(40) code!: string;
  @IsString() @MinLength(3) @MaxLength(500) description!: string;
  @IsOptional()
  @Transform(uppercaseOrganizationStatus)
  @IsIn(Object.values(EntityStatus))
  status?: EntityStatus;
}
export class UpdateDepartmentDto extends ExpectedVersionDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(40) code?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(500) description?: string;
}
export class DepartmentStatusDto extends OrganizationStatusDto {}
export class DepartmentResponseDto {
  id!: string;
  organizationId!: string;
  name!: string;
  code!: string;
  description!: string;
  status!: string;
  version!: number;
  permissions!: Record<string, boolean>;
}
