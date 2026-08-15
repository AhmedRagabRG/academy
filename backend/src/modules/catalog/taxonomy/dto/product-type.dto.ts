import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  EntityStatus,
  ProductFieldKind,
} from '../../../../../prisma/generated/client';
export class ProductTypeFieldDto {
  @IsString() key!: string;
  @IsString() label!: string;
  @IsEnum(ProductFieldKind) kind!: ProductFieldKind;
  @IsBoolean() required!: boolean;
  @IsInt() @Min(1) position!: number;
}
export class UpdateProductTypeDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTypeFieldDto)
  fields?: ProductTypeFieldDto[];
}
export class ProductTypeStatusDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsEnum(EntityStatus) status!: EntityStatus;
}
