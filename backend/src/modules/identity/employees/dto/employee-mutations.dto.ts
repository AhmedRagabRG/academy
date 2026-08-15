import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, type TransformFnParams } from 'class-transformer';
import { EntityStatus } from '../../../../../prisma/generated/client';
import { MatchesProperty } from '../../../../shared/validation/matches-property.decorator';
const uppercaseStatus = ({ value: raw }: TransformFnParams): unknown => {
  const value: unknown = raw;
  return typeof value === 'string' ? value.toUpperCase() : value;
};
export class CreateEmployeeDto {
  @IsEmail() email!: string;
  @IsString() @MaxLength(150) displayName!: string;
  @Matches(/^\+[1-9]\d{7,14}$/) phone!: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsArray() @IsUUID('4', { each: true }) branchIds!: string[];
  @IsArray() @IsUUID('4', { each: true }) roleIds!: string[];
  @IsString() @MinLength(1) password!: string;
  @Transform(uppercaseStatus)
  @IsEnum(EntityStatus)
  status!: EntityStatus;
  @IsOptional() organizationWide?: boolean;
}
export class UpdateEmployeeDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(150) displayName?: string;
  @IsOptional() @Matches(/^\+[1-9]\d{7,14}$/) phone?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) branchIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) roleIds?: string[];
  @IsOptional() @IsObject() avatar?: Record<string, unknown>;
  @IsInt() @Min(1) expectedVersion!: number;
}
export class EmployeeStatusDto {
  @Transform(uppercaseStatus)
  @IsEnum(EntityStatus)
  status!: EntityStatus;
  @IsInt() @Min(1) expectedVersion!: number;
}
export class ResetPasswordDto {
  @IsString() @MinLength(1) newPassword!: string;
  @IsString()
  @MatchesProperty('newPassword', { message: 'يجب أن تتطابق كلمتا المرور' })
  confirmPassword!: string;
  @IsInt() @Min(1) expectedVersion!: number;
}
