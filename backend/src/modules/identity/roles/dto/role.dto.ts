import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { EntityStatus } from '../../../../../prisma/generated/client';
import { Transform, type TransformFnParams } from 'class-transformer';
const uppercaseStatus = ({ value: raw }: TransformFnParams): unknown => {
  const value: unknown = raw;
  return typeof value === 'string' ? value.toUpperCase() : value;
};
export class CreateRoleDto {
  @IsString() @Matches(/^[a-z][a-z0-9.-]*$/) @MaxLength(80) code!: string;
  @IsString() @MaxLength(150) displayName!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsArray() @IsUUID('4', { each: true }) permissionIds!: string[];
  @Transform(uppercaseStatus)
  @IsEnum(EntityStatus)
  status!: EntityStatus;
}
export class UpdateRoleDto {
  @IsOptional() @IsString() @MaxLength(150) displayName?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsInt() @Min(1) expectedVersion!: number;
}
export class RoleStatusDto {
  @Transform(uppercaseStatus)
  @IsEnum(EntityStatus)
  status!: EntityStatus;
  @IsInt() @Min(1) expectedVersion!: number;
}
export class ReplaceRolePermissionsDto {
  @IsArray() @IsUUID('4', { each: true }) permissionIds!: string[];
  @IsInt() @Min(1) expectedVersion!: number;
}
