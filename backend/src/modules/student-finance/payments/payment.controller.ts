import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  ApiFinanceCreate,
  ApiFinanceRead,
} from '../../../shared/swagger/finance-api.decorator';
import { PaymentSummaryDto } from './dto/payment-response.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PaymentService } from './payment.service';

/**
 * Transport only. There is deliberately no PATCH, PUT or DELETE here: a
 * recorded payment is immutable, and a refund is the only correction
 * (contract "Prohibited Surface").
 */
@ApiTags('Student Finance — Payments')
@Controller('finance/payments')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Get()
  @RequirePermissions('finance.payments.view')
  @ApiFinanceRead('قائمة المدفوعات', PaymentSummaryDto)
  list(@Query() query: ListPaymentsDto, @CurrentCaller() caller: CallerContext) {
    return this.service.list(caller, query);
  }

  @Post()
  @RequirePermissions('finance.payments.record')
  @ApiFinanceCreate(
    'Record an immutable payment against an invoice',
    PaymentSummaryDto,
  )
  record(
    @Body() dto: RecordPaymentDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.record(caller, dto);
  }
}
