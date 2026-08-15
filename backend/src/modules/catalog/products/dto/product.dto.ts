import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform, type TransformFnParams } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  InstallmentFrequency,
  ProductAssetKind,
  ProductBranchRole,
  ProductContentKind,
  ProductStatus,
} from '../../../../../prisma/generated/client';

const toStringArray = ({ value: raw }: TransformFnParams): string[] => {
  const value: unknown = raw;
  return typeof value === 'string'
    ? value.split(',').filter(Boolean)
    : Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
};

export class MoneyDto {
  @ApiProperty({ example: '1250.00' })
  @Matches(/^(0|[1-9]\d*)(\.\d+)?$/)
  amount!: string;
  @ApiProperty({ example: 'EGP' }) @Matches(/^[A-Z]{3}$/) currency!: string;
  @ApiProperty({ minimum: 0, maximum: 6, example: 2 })
  @IsInt()
  @Min(0)
  @Max(6)
  precision!: number;
}
export class PricingDto {
  @ValidateNested() @Type(() => MoneyDto) basePrice!: MoneyDto;
  @ValidateNested() @Type(() => MoneyDto) registrationFees!: MoneyDto;
  @ValidateNested() @Type(() => MoneyDto) certificateFees!: MoneyDto;
  @ValidateNested() @Type(() => MoneyDto) trainingFees!: MoneyDto;
  @ValidateNested() @Type(() => MoneyDto) cardFees!: MoneyDto;
  @ValidateNested() @Type(() => MoneyDto) examFees!: MoneyDto;
  @ValidateNested() @Type(() => MoneyDto) additionalFees!: MoneyDto;
  @ValidateNested() @Type(() => MoneyDto) discount!: MoneyDto;
  @ValidateNested() @Type(() => MoneyDto) scholarship!: MoneyDto;
  @IsBoolean() installmentAvailable!: boolean;
  @IsInt() @Min(1) @Max(60) installmentMinCount!: number;
  @IsInt() @Min(1) @Max(60) installmentMaxCount!: number;
  @IsEnum(InstallmentFrequency) installmentFrequency!: InstallmentFrequency;
}
export class ProductBranchDto {
  @IsUUID() branchId!: string;
  @IsEnum(ProductBranchRole) role!: ProductBranchRole;
}
export class ProductContentDto {
  @IsOptional() @IsUUID() id?: string;
  @IsEnum(ProductContentKind) kind!: ProductContentKind;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsInt() @Min(1) position!: number;
}
export class ProductAssetDto {
  @IsOptional() @IsUUID() id?: string;
  @IsEnum(ProductAssetKind) kind!: ProductAssetKind;
  @IsOptional() @IsString() fileId?: string;
  @IsOptional() @IsString() fileName?: string;
  @IsOptional() @IsString() originalName?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsInt() @Min(0) size?: number;
  @IsString() url!: string;
  @IsOptional() @IsString() label?: string;
  @IsInt() @Min(1) position!: number;
}
export class CreateProductDto {
  @ApiProperty({ example: 'PROG-001' }) @IsString() code!: string;
  @IsString() officialName!: string;
  @IsString() nameAr!: string;
  @IsString() nameEn!: string;
  @IsUUID() productTypeId!: string;
  @IsUUID() categoryId!: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsString() description!: string;
  @IsOptional() @IsInt() @Min(1) durationValue?: number;
  @IsOptional() @IsUUID() durationUnitId?: string;
  @IsOptional() @IsUUID() studyModeId?: string;
  @IsOptional() @IsInt() @Min(1) numberOfTerms?: number;
  @IsOptional() @IsInt() @Min(1) numberOfSessions?: number;
  @IsOptional() @IsInt() @Min(1) numberOfHours?: number;
  @IsOptional() @IsBoolean() internshipIncluded?: boolean;
  @IsOptional() @IsBoolean() trainingIncluded?: boolean;
  @IsOptional() @IsBoolean() finalProjectRequired?: boolean;
  @IsOptional() @IsBoolean() certificateIncluded?: boolean;
  @IsOptional() @IsUUID() instructorEmployeeId?: string;
  @IsOptional() @IsString() salesScript?: string;
  @IsOptional() @ValidateNested() @Type(() => PricingDto) pricing?: PricingDto;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductBranchDto)
  branches?: ProductBranchDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductContentDto)
  content?: ProductContentDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAssetDto)
  assets?: ProductAssetDto[];
}
export class UpdateProductDto extends CreateProductDto {
  @IsInt() @Min(1) expectedVersion!: number;
}
export class ProductStatusDto {
  @IsEnum(ProductStatus) toStatus!: ProductStatus;
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsString() reason?: string;
}
export class ProductIdDto {
  @IsUUID() id!: string;
}
export class ProductListDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsEnum(ProductStatus, { each: true })
  statuses?: ProductStatus[];
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsUUID('4', { each: true })
  typeIds?: string[];
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsUUID('4', { each: true })
  departmentIds?: string[];
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds?: string[];
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsUUID('4', { each: true })
  studyModeIds?: string[];
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
  @IsOptional()
  @IsEnum(['name', 'code', 'price', 'updatedAt'] as const)
  sort?: 'name' | 'code' | 'price' | 'updatedAt';
  @IsOptional() @IsEnum(['asc', 'desc'] as const) sortOrder?: 'asc' | 'desc';
}
export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() officialName!: string;
  @ApiProperty({ enum: ProductStatus }) status!: ProductStatus;
  @ApiProperty() version!: number;
}
