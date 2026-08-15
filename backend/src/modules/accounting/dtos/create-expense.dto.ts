import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** A calendar date or a full ISO 8601 timestamp. */
const ISO_8601 =
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Transforms are typed so no `any` leaks out of class-transformer.
 *
 * The shape check happens *here* rather than through `@IsISO8601`, because
 * class-transformer runs before class-validator: a string rule placed on this
 * property would only ever see the `Date` this returns and reject every input.
 * An unparseable value is passed through untouched so `@IsDate` rejects it.
 */
const toDate = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string' || !ISO_8601.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
};

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateExpenseDto {
  /** Defaults to the caller's first authorized branch when omitted. */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  categoryId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  subcategoryId!: string;

  @ApiProperty({ example: '2026-08-05' })
  @IsDate({ message: 'expenseDate must be a valid ISO 8601 date string' })
  @Transform(toDate)
  expenseDate!: Date;

  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  description!: string;

  @ApiProperty({ example: '15000.00' })
  @Transform(trim)
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'amount must be a positive decimal string',
  })
  amount!: string;

  /**
   * Optional, and checked rather than trusted: the organization's configured
   * currency is what gets recorded. Stating a different one is refused.
   */
  @ApiPropertyOptional({ example: 'EGP', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;
}
