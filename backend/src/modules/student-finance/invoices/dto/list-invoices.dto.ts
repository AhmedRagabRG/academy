import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PageQueryDto } from '../../../../shared/pagination/page-query.dto';

export const INVOICE_SORT_FIELDS = [
  'invoiceNumber',
  'studentName',
  'dueDate',
  'issueDate',
  'updatedAt',
  'status',
] as const;

/** The wire spellings, lower-kebab like every other status this API publishes. */
export const INVOICE_STATUSES = [
  'draft',
  'issued',
  'partially-paid',
  'paid',
  'cancelled',
] as const;

/** Accepts both `?statuses=a&statuses=b` and `?statuses=a,b`. */
const toArray = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string')
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  return value;
};

export class ListInvoicesDto extends PageQueryDto {
  @ApiPropertyOptional({
    description: 'Arabic- and digit-folded free text over student and number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: INVOICE_STATUSES, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(INVOICE_STATUSES, { each: true })
  statuses?: (typeof INVOICE_STATUSES)[number][];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds?: string[];

  @ApiPropertyOptional({ description: 'Charge purpose lookup code' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  purpose?: string;

  @ApiPropertyOptional({ enum: INVOICE_SORT_FIELDS, default: 'updatedAt' })
  @IsOptional()
  @IsIn(INVOICE_SORT_FIELDS)
  sortBy?: (typeof INVOICE_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
