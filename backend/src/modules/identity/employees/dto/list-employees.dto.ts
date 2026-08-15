import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { EntityStatus } from '../../../../../prisma/generated/client';
const uppercaseStatus = ({ value: raw }: TransformFnParams): unknown => {
  const value: unknown = raw;
  return typeof value === 'string' ? value.toUpperCase() : value;
};
export enum EmployeeSort {
  DisplayName = 'displayName',
  Email = 'email',
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
}
export class ListEmployeesDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() roleId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional()
  @Transform(uppercaseStatus)
  @IsEnum(EntityStatus)
  status?: EntityStatus;
  @IsOptional() @IsEnum(EmployeeSort) sort?: EmployeeSort;
  @IsOptional() @IsEnum(['asc', 'desc']) sortOrder?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
