import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO4217CurrencyCode,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const DECIMAL = /^(0|[1-9]\d*)(\.\d+)?$/;

export class BatchMoneyDto {
  @Matches(DECIMAL) amount!: string;
  @IsISO4217CurrencyCode() currency!: string;
  @IsInt() @Min(0) @Max(6) precision!: number;
}

export class BatchInstallmentDto {
  @IsUUID() id!: string;
  @IsString() label!: string;
  @Matches(DECIMAL) value!: string;
  @IsString() milestone!: string;
  @IsInt() @Min(1) position!: number;
}

export class BatchInstallmentPlanDto {
  @IsUUID() id!: string;
  @IsString() name!: string;
  @IsIn(['amount', 'percentage']) basis!: 'amount' | 'percentage';
  @IsIn(['program-price', 'registration-fee', 'combined'])
  coveredCharge!: 'program-price' | 'registration-fee' | 'combined';
  @IsIn(['active', 'inactive']) status!: 'active' | 'inactive';
  @IsInt() @Min(1) position!: number;
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BatchInstallmentDto)
  installments!: BatchInstallmentDto[];
}

export class BatchOfferDto {
  @IsUUID() id!: string;
  @IsIn(['discount', 'scholarship']) kind!: 'discount' | 'scholarship';
  @IsString() name!: string;
  @IsIn(['amount', 'percentage']) valueType!: 'amount' | 'percentage';
  @Matches(DECIMAL) value!: string;
  @IsInt() @Min(0) @Max(6) precision!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;
  @IsIn(['active', 'inactive']) status!: 'active' | 'inactive';
  @IsInt() @Min(1) position!: number;
}

export class BatchFinancialProfileDto {
  @ApiProperty({ type: BatchMoneyDto })
  @ValidateNested()
  @Type(() => BatchMoneyDto)
  programPrice!: BatchMoneyDto;

  @ApiProperty({ type: BatchMoneyDto })
  @ValidateNested()
  @Type(() => BatchMoneyDto)
  registrationFee!: BatchMoneyDto;

  @IsBoolean() installmentsEnabled!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchInstallmentPlanDto)
  installmentPlans!: BatchInstallmentPlanDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchOfferDto)
  offers!: BatchOfferDto[];
}
