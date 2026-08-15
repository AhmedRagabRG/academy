import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PageQueryDto } from '../../../../shared/pagination/page-query.dto';

export const SCHEDULE_BASES = ['weekly', 'monthly', 'bimonthly', 'custom'] as const;
export const INSTALLMENT_SORT_FIELDS = ['dueDate', 'amount', 'sequence'] as const;
export const INSTALLMENT_STATUSES = [
  'pending',
  'partially-paid',
  'paid',
  'overdue',
] as const;

const toArray = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string')
    return value.split(',').map((e) => e.trim()).filter(Boolean);
  return value;
};

export class GenerateInstallmentPlanDto {
  /** Upper bound is enforced per offering kind by the schedule policy. */
  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  count!: number;

  @ApiProperty({ enum: SCHEDULE_BASES })
  @IsIn(SCHEDULE_BASES)
  scheduleBasis!: (typeof SCHEDULE_BASES)[number];

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  firstDueDate?: string;

  /** Required when `scheduleBasis` is `custom`; one date per installment. */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsDateString({ strict: true }, { each: true })
  customDueDates?: string[];

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class ListInstallmentsDto extends PageQueryDto {
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

  @ApiPropertyOptional({ enum: INSTALLMENT_STATUSES, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(INSTALLMENT_STATUSES, { each: true })
  statuses?: (typeof INSTALLMENT_STATUSES)[number][];

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString({ strict: true })
  dateTo?: string;

  @ApiPropertyOptional({ enum: INSTALLMENT_SORT_FIELDS })
  @IsOptional()
  @IsIn(INSTALLMENT_SORT_FIELDS)
  sortBy?: (typeof INSTALLMENT_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
