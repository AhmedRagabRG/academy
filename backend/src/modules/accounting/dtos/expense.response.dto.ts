import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ExpensePermissions } from '../types/expense.types';
import type { ExpenseStatusWire } from './expense-query.dto';

export class MoneyDto {
  amount!: string;
  currency!: string;
  precision!: number;
}

export class UserReferenceDto {
  id!: string;
  name!: string;
}

export class AttachmentDto {
  id!: string;
  fileName!: string;
  mimeType!: string;
  fileSize!: number;
  uploadedAt!: Date;
  uploadedBy!: UserReferenceDto;
  /**
   * Where the stored file is served from, so a reviewer can open the evidence.
   *
   * The bytes were always stored; they were simply never addressed, which left
   * an approver deciding on a document they could not read.
   */
  previewUrl?: string;
}

export class ExpenseCommentDto {
  id!: string;
  expenseRequestId!: string;
  body!: string;
  author!: UserReferenceDto;
  createdAt!: Date;
}

export class ApprovalHistoryDto {
  id!: string;
  action!: string;
  previousStatus?: ExpenseStatusWire;
  newStatus!: ExpenseStatusWire;
  performedBy!: UserReferenceDto;
  performedAt!: Date;
  comment?: string;
}

export class ExpenseResponseDto {
  id!: string;
  expenseNumber!: string;
  branchId!: string;
  categoryId!: string;
  subcategoryId!: string;
  requestedById!: string;
  expenseDate!: Date;
  description!: string;
  amount!: string;
  currency!: string;
  precision!: number;
  status!: ExpenseStatusWire;
  isArchived!: boolean;
  version!: number;
  createdAt!: Date;
  updatedAt!: Date;
  attachments?: AttachmentDto[];
  approvalHistory?: ApprovalHistoryDto[];
  permissions!: ExpensePermissions;
}

export class ExpenseListDto {
  id!: string;
  expenseNumber!: string;
  branchId!: string;
  categoryId!: string;
  subcategoryId!: string;
  requestedById!: string;
  expenseDate!: Date;
  description!: string;
  amount!: string;
  currency!: string;
  status!: ExpenseStatusWire;
  isArchived!: boolean;
  version!: number;
  createdAt!: Date;
  updatedAt!: Date;
  permissions!: ExpensePermissions;
  /**
   * How many documents the request carries. The queue shows it as a column,
   * and without it a submitted request — which cannot exist without at least
   * one attachment — reads on screen as having none.
   *
   * Populated on list reads. The command endpoints return the row's new state
   * rather than a table row and leave it absent, which reads as "not reported"
   * instead of as zero.
   */
  attachmentCount?: number;
}

export class ApprovalActionDto {
  expectedVersion!: number;
  comment?: string;
}

/**
 * The list query.
 *
 * Every property carries a validator on purpose: the global pipe runs with
 * `whitelist` and `forbidNonWhitelisted`, so an undecorated property is not
 * merely ignored — it is rejected as "should not exist", which made the
 * documented `page`, `status` and `categoryId` parameters unusable.
 */
export class ExpenseQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsIn([
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'RETURNED',
    'ARCHIVED',
  ])
  status?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  requestedBy?: string;

  @IsOptional()
  @IsUUID()
  approvedBy?: string;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsIn(['createdAt', 'expenseDate', 'amount', 'status', 'updatedAt'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  includeArchived?: boolean;
}

export class ListResponseDto<T> {
  success!: boolean;
  data!: T[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class DetailResponseDto<T> {
  success!: boolean;
  data!: T;
}
