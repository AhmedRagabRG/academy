import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** A calendar date or a full ISO 8601 timestamp. */
const ISO_8601 =
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * See the note on the same helper in `create-expense.dto.ts`: the shape check
 * lives in the transform because class-transformer runs first, so a string
 * rule on the property would only ever see the `Date` this returns.
 */
const toDate = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string' || !ISO_8601.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
};

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateExpenseDto {
  /** Optimistic concurrency: the version the client last read. */
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiPropertyOptional({ example: '2026-08-05' })
  @IsOptional()
  @IsDate({ message: 'expenseDate must be a valid ISO 8601 date string' })
  @Transform(toDate)
  expenseDate?: Date;

  @ApiPropertyOptional({ minLength: 5, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '15000.00' })
  @IsOptional()
  @Transform(trim)
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'amount must be a positive decimal string',
  })
  amount?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  subcategoryId?: string;
}
