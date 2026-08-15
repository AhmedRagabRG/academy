import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const TIMELINE_CATEGORIES = [
  'invoice-created',
  'invoice-issued',
  'invoice-cancelled',
  'installment-plan-generated',
  'payment-received',
  'discount-applied',
  'scholarship-applied',
  'adjustment-recorded',
  'refund-requested',
  'refund-completed',
] as const;

const toArray = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string')
    return value.split(',').map((e) => e.trim()).filter(Boolean);
  return value;
};

/** Cursor paging, not offset: a new event must not shift a page mid-scroll. */
export class ListTimelineDto {
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'The last sequence seen' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ enum: TIMELINE_CATEGORIES, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(TIMELINE_CATEGORIES, { each: true })
  categories?: string[];
}
