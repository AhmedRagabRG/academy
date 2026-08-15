import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MoneyDto } from '../../../../shared/dto/money.dto';

/**
 * Response shapes exist so Swagger documents what an endpoint really returns,
 * not a bare 200 with an untyped body (constitution Principle XVII). They are
 * documentation contracts; the mapper produces the values.
 */
export class ActorRefDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() active!: boolean;
}

export class InvoiceFiguresDto {
  @ApiProperty({ type: MoneyDto }) totalAmount!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) discountTotal!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) scholarshipTotal!: MoneyDto;
  @ApiProperty({
    type: MoneyDto,
    description:
      'Derived by the reduction policy; never accepted from a client',
  })
  finalAmount!: MoneyDto;
}

export class DerivedBalanceDto {
  @ApiProperty({ type: MoneyDto }) finalAmount!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) netPaid!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) remaining!: MoneyDto;
  @ApiProperty({
    enum: ['draft', 'issued', 'partially-paid', 'paid', 'cancelled'],
  })
  status!: string;
  @ApiProperty({
    description: 'Derived from the due date and what is still owed',
  })
  isOverdue!: boolean;
}

export class InvoiceStatusChangeDto {
  @ApiProperty({ nullable: true }) fromStatus!: string | null;
  @ApiProperty() toStatus!: string;
  @ApiPropertyOptional() reason?: string;
  @ApiProperty({ type: ActorRefDto }) actor!: ActorRefDto;
  @ApiProperty() occurredAt!: string;
}

export class FinancePermissionsDto {
  @ApiProperty() view!: boolean;
  @ApiProperty() invoicesView!: boolean;
  @ApiProperty() invoicesCreate!: boolean;
  @ApiProperty() invoicesUpdate!: boolean;
  @ApiProperty() invoicesIssue!: boolean;
  @ApiProperty() invoicesCancel!: boolean;
  @ApiProperty() installmentsManage!: boolean;
  @ApiProperty() paymentsView!: boolean;
  @ApiProperty() paymentsRecord!: boolean;
  @ApiProperty() discountsApprove!: boolean;
  @ApiProperty() scholarshipsApprove!: boolean;
  @ApiProperty() refundsView!: boolean;
  @ApiProperty() refundsRecord!: boolean;
  @ApiProperty() refundsApprove!: boolean;
  @ApiProperty() timelineView!: boolean;
  @ApiProperty() export!: boolean;
}

export class InvoiceSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'INV-2026-00001' }) invoiceNumber!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentCode!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() offeringLabel!: string;
  @ApiPropertyOptional() batchLabel?: string;
  @ApiProperty() branchId!: string;
  @ApiProperty({ example: 'tuition' }) purpose!: string;
  @ApiPropertyOptional({ example: '2026-07-25' }) issueDate?: string;
  @ApiProperty({ example: '2026-08-24' }) dueDate!: string;
  @ApiProperty({ type: MoneyDto }) finalAmount!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) paidAmount!: MoneyDto;
  @ApiProperty({ type: MoneyDto }) remaining!: MoneyDto;
  @ApiProperty() status!: string;
  @ApiProperty() isOverdue!: boolean;
  @ApiProperty() updatedAt!: string;
  @ApiProperty() version!: number;
}

export class InvoiceDetailDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty({ example: 'INV-2026-00001' }) invoiceNumber!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentCode!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() enrollmentId!: string;
  @ApiProperty() branchId!: string;
  @ApiProperty() offeringId!: string;
  @ApiProperty() offeringLabel!: string;
  @ApiProperty({
    enum: ['professional-program', 'professional-diploma', 'training-course'],
  })
  offeringKind!: string;
  @ApiPropertyOptional() batchId?: string;
  @ApiPropertyOptional() batchLabel?: string;
  @ApiProperty({ example: 'tuition' }) purpose!: string;
  @ApiPropertyOptional({ example: '2026-07-25' }) issueDate?: string;
  @ApiProperty({ example: '2026-08-24' }) dueDate!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() precision!: number;
  @ApiProperty({ type: InvoiceFiguresDto }) draft!: InvoiceFiguresDto;
  @ApiPropertyOptional({
    type: InvoiceFiguresDto,
    description: 'Absent until issuance; written exactly once when it appears',
  })
  issuedSnapshot?: InvoiceFiguresDto;
  @ApiProperty() status!: string;
  @ApiProperty({ type: [InvoiceStatusChangeDto] })
  statusHistory!: InvoiceStatusChangeDto[];
  @ApiPropertyOptional() cancelledAt?: string;
  @ApiPropertyOptional() cancelReason?: string;
  @ApiProperty({ type: DerivedBalanceDto }) derived!: DerivedBalanceDto;
  @ApiProperty({ type: FinancePermissionsDto })
  permissions!: FinancePermissionsDto;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ type: ActorRefDto }) createdBy!: ActorRefDto;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ type: ActorRefDto }) updatedBy!: ActorRefDto;
}
