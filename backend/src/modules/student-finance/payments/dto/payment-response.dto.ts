import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MoneyDto } from '../../../../shared/dto/money.dto';

export class PaymentActorDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

/**
 * Documents what `GET`/`POST /finance/payments` really returns, so Swagger
 * describes the payload rather than a bare 200 (Principle XVII). The mapper
 * produces the values; this class only names them.
 */
export class PaymentSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() invoiceId!: string;
  @ApiPropertyOptional() installmentId?: string;
  @ApiProperty({ example: 'RCP-2026-00001' }) receiptNumber!: string;
  @ApiProperty({ type: MoneyDto }) amount!: MoneyDto;
  @ApiProperty({ example: '2026-08-06' }) paymentDate!: string;
  @ApiProperty({
    description:
      'The FINANCE_PAYMENT_METHOD lookup value; inactive methods stay resolvable so historical payments keep their label',
  })
  paymentMethodId!: string;
  @ApiPropertyOptional({ maxLength: 500 }) notes?: string;
  @ApiProperty({ format: 'date-time' }) recordedAt!: string;
  @ApiProperty({ type: PaymentActorDto }) recordedBy!: PaymentActorDto;
}
