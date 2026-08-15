import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
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
import { PageQueryDto } from '../../../../shared/pagination/page-query.dto';

export const REFUND_STATUSES = [
  'requested',
  'approved',
  'completed',
  'rejected',
  'cancelled',
] as const;

export const REFUND_SORT_FIELDS = ['refundDate', 'amount'] as const;

const toArray = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string')
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  return value;
};

export class RequestRefundDto {
  /** A refund always reverses a specific payment; that is what bounds it. */
  @ApiProperty()
  @IsUUID()
  paymentId!: string;

  @ApiProperty({ example: '250.00' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'amount must be a positive decimal string',
  })
  amount!: string;

  @ApiProperty({ minLength: 3, maxLength: 255 })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason!: string;

  @ApiProperty({ example: '2026-08-06' })
  @IsDateString({ strict: true })
  refundDate!: string;
}

export class DecideRefundDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  /** Required when rejecting — enforced in the service against the target. */
  @ApiPropertyOptional({ minLength: 3, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class CompleteRefundDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class ListRefundsDto extends PageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds?: string[];

  @ApiPropertyOptional({ enum: REFUND_STATUSES, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(REFUND_STATUSES, { each: true })
  statuses?: (typeof REFUND_STATUSES)[number][];

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString({ strict: true })
  dateTo?: string;

  @ApiPropertyOptional({ enum: REFUND_SORT_FIELDS })
  @IsOptional()
  @IsIn(REFUND_SORT_FIELDS)
  sortBy?: (typeof REFUND_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
