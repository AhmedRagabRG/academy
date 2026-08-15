import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EntityStatus } from '../../../../../prisma/generated/client';
import {
  ExpectedVersionDto,
  ExpectedAcademicYearVersionDto,
  OrganizationListDto,
  OrganizationStatusDto,
  uppercaseOrganizationStatus,
} from '../../types/organization.dto';
export class AcademicTermListDto extends OrganizationListDto {
  @IsOptional() @IsUUID() academicYearId?: string;
  @IsOptional() @IsIn(['order', 'name', 'startDate', 'updatedAt']) sort?:
    'order' | 'name' | 'startDate' | 'updatedAt';
}
export class CreateAcademicTermDto extends ExpectedAcademicYearVersionDto {
  @IsUUID() academicYearId!: string;
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate!: string;
  @IsInt() @Min(1) order!: number;
  @IsOptional()
  @Transform(uppercaseOrganizationStatus)
  @IsIn(Object.values(EntityStatus))
  status?: EntityStatus;
}
export class UpdateAcademicTermDto extends ExpectedVersionDto {
  @IsOptional() @IsUUID() academicYearId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate?: string;
  @IsOptional() @IsInt() @Min(1) order?: number;
  @IsInt() @Min(1) expectedAcademicYearVersion!: number;
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedDestinationAcademicYearVersion?: number;
}
export class AcademicTermStatusDto extends OrganizationStatusDto {}
export class AcademicTermResponseDto {
  id!: string;
  academicYearId!: string;
  academicYearName!: string;
  name!: string;
  startDate!: string;
  endDate!: string;
  order!: number;
  status!: string;
  version!: number;
  permissions!: Record<string, boolean>;
}
