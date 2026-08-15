import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  ApiFinanceCreate,
  ApiFinanceMutation,
  ApiFinanceRead,
} from '../../../shared/swagger/finance-api.decorator';
import {
  CompleteRefundDto,
  DecideRefundDto,
  ListRefundsDto,
  RequestRefundDto,
} from './dto/request-refund.dto';
import { RefundResponseDto } from './dto/refund-response.dto';
import { RefundService } from './refund.service';

/** Transport only; the lifecycle rules live in the service and its policy. */
@ApiTags('Student Finance — Refunds')
@Controller('finance/refunds')
export class RefundController {
  constructor(private readonly service: RefundService) {}

  @Get()
  @RequirePermissions('finance.refunds.view')
  @ApiFinanceRead('قائمة طلبات الاسترداد', RefundResponseDto)
  list(@Query() query: ListRefundsDto, @CurrentCaller() caller: CallerContext) {
    return this.service.list(caller, query);
  }

  @Post()
  @RequirePermissions('finance.refunds.record')
  @ApiFinanceCreate('Request a refund against a payment', RefundResponseDto)
  request(
    @Body() dto: RequestRefundDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.request(caller, dto);
  }

  @Patch(':refundId/decision')
  @RequirePermissions('finance.refunds.approve')
  @ApiFinanceMutation(
    'Approve or reject a refund request; reason required on reject',
    RefundResponseDto,
  )
  decide(
    @Param('refundId') refundId: string,
    @Body() dto: DecideRefundDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.decide(caller, refundId, dto);
  }

  @Post(':refundId/complete')
  @RequirePermissions('finance.refunds.approve')
  @ApiFinanceMutation(
    'Complete an approved refund — the only transition that moves money',
    RefundResponseDto,
  )
  complete(
    @Param('refundId') refundId: string,
    @Body() dto: CompleteRefundDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.complete(caller, refundId, dto);
  }
}
