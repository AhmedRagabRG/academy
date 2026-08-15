import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EntityStatus } from '../../../../../prisma/generated/client';
import {
  ExpectedVersionDto,
  OrganizationListDto,
  OrganizationStatusDto,
  uppercaseOrganizationStatus,
} from '../../types/organization.dto';
export class AcademicYearListDto extends OrganizationListDto {
  @IsOptional() @IsIn(['name', 'code', 'startDate', 'updatedAt']) sort?:
    'name' | 'code' | 'startDate' | 'updatedAt';
}
export class CreateAcademicYearDto {
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsString() @MinLength(2) @MaxLength(40) code!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate!: string;
  @IsOptional()
  @Transform(uppercaseOrganizationStatus)
  @IsIn([EntityStatus.INACTIVE, EntityStatus.ACTIVE])
  status?: EntityStatus;
}
export class UpdateAcademicYearDto extends ExpectedVersionDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(40) code?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate?: string;
}
export class AcademicYearStatusDto extends OrganizationStatusDto {}
export class ActivateAcademicYearDto extends ExpectedVersionDto {}
export class AcademicYearResponseDto {
  id!: string;
  organizationId!: string;
  name!: string;
  code!: string;
  startDate!: string;
  endDate!: string;
  status!: string;
  version!: number;
  permissions!: Record<string, boolean>;
}
