import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MoneyDto } from '../../../../shared/dto/money.dto';
import { REFUND_STATUSES } from './request-refund.dto';

export class RefundActorDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class RefundResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() paymentId!: string;
  @ApiProperty() invoiceId!: string;
  @ApiProperty({ type: MoneyDto }) amount!: MoneyDto;
  @ApiProperty() reason!: string;
  @ApiProperty({ example: '2026-08-06' }) refundDate!: string;
  @ApiProperty({ enum: REFUND_STATUSES }) status!: string;
  @ApiProperty({ type: RefundActorDto }) requestedBy!: RefundActorDto;
  @ApiProperty({ format: 'date-time' }) requestedAt!: string;
  @ApiPropertyOptional({ type: RefundActorDto }) decidedBy?: RefundActorDto;
  @ApiPropertyOptional({ format: 'date-time' }) decidedAt?: string;
  @ApiPropertyOptional() decisionReason?: string;
  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Set only once the refund is completed and money has moved',
  })
  completedAt?: string;
  @ApiProperty({ example: 1 }) version!: number;
}
