import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MoneyDto } from '../../../../shared/dto/money.dto';
import { TIMELINE_CATEGORIES } from './list-timeline.dto';

export class StatementTotalsDto {
  @ApiProperty({ type: MoneyDto }) totalFees!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) paidAmount!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) remainingBalance!: MoneyDto;
}

export class PerEnrollmentTotalsDto extends StatementTotalsDto {
  @ApiProperty() enrollmentId!: string;
  @ApiProperty() offeringLabel!: string;
}

export class StudentFinancialProfileDto {
  @ApiProperty() studentId!: string;
  @ApiProperty({ type: StatementTotalsDto }) totals!: StatementTotalsDto;
  @ApiProperty({ example: 2 }) outstandingInstallments!: number;
  @ApiProperty({
    enum: ['no-outstanding-balance', 'partial-balance', 'overdue', 'completed'],
  })
  financialStatus!: string;
  @ApiProperty({ type: [Object] }) scholarships!: unknown[];
  @ApiProperty({ type: [Object] }) discounts!: unknown[];
  @ApiProperty({ type: [PerEnrollmentTotalsDto] })
  perEnrollment!: PerEnrollmentTotalsDto[];
  @ApiProperty({
    description:
      'True when the student has no invoices at all — distinct from owing nothing',
  })
  hasNoRecords!: boolean;
  @ApiProperty({ format: 'date-time' }) asOf!: string;
}

export class TimelineItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: TIMELINE_CATEGORIES }) category!: string;
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
  @ApiProperty() summary!: string;
  @ApiPropertyOptional() invoiceId?: string;
  @ApiPropertyOptional({ type: MoneyDto }) amount?: MoneyDto;
}

export class TimelinePageDto {
  @ApiProperty({ type: [TimelineItemResponseDto] })
  items!: TimelineItemResponseDto[];
  @ApiProperty({ nullable: true }) nextCursor!: string | null;
}
