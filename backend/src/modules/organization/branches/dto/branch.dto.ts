import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { EntityStatus } from '../../../../../prisma/generated/client';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  OrganizationListDto,
  OrganizationStatusDto,
  ExpectedVersionDto,
  uppercaseOrganizationStatus,
} from '../../types/organization.dto';

export class BranchListDto extends OrganizationListDto {
  @ApiPropertyOptional({ enum: ['name', 'code', 'updatedAt'] })
  @IsOptional()
  @IsIn(['name', 'code', 'updatedAt'])
  sort?: 'name' | 'code' | 'updatedAt';
}
export class CreateBranchDto {
  @ApiProperty({ example: 'فرع القاهرة' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;
  @ApiProperty({ example: 'CAI' })
  @IsString()
  @MinLength(2)
  @MaxLength(12)
  code!: string;
  @IsString() @MinLength(3) @MaxLength(500) address!: string;
  @Matches(/^\+?[0-9]{8,15}$/) phone!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsString() @MinLength(3) @MaxLength(200) workingHours!: string;
  @IsOptional()
  @Transform(uppercaseOrganizationStatus)
  @IsIn(Object.values(EntityStatus))
  status?: EntityStatus;
}
export class UpdateBranchDto extends ExpectedVersionDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(12) code?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(500) address?: string;
  @IsOptional() @Matches(/^\+?[0-9]{8,15}$/) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) workingHours?: string;
}
export class BranchStatusDto extends OrganizationStatusDto {}
export class BranchResponseDto {
  id!: string;
  organizationId!: string;
  name!: string;
  code!: string;
  address!: string;
  phone!: string;
  email!: string;
  managerId!: string | null;
  workingHours!: string;
  status!: string;
  version!: number;
  permissions!: Record<string, boolean>;
}
