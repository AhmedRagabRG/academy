import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { ApiFinanceCreate } from '../../../shared/swagger/finance-api.decorator';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { AwardScholarshipDto } from './dto/award-scholarship.dto';
import {
  DiscountResponseDto,
  ScholarshipResponseDto,
} from './dto/reduction-response.dto';
import { ReductionService } from './reduction.service';

/** Transport only; caps and below-collected rules live in the policy. */
@ApiTags('Student Finance — Reductions')
@Controller('finance')
export class ReductionController {
  constructor(private readonly service: ReductionService) {}

  @Post('invoices/:invoiceId/discounts')
  @RequirePermissions('finance.discounts.approve')
  @ApiFinanceCreate('Apply a discount to an invoice', DiscountResponseDto)
  applyDiscount(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: ApplyDiscountDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.applyDiscount(caller, invoiceId, dto);
  }

  @Post('scholarships')
  @RequirePermissions('finance.scholarships.approve')
  @ApiFinanceCreate('Award a scholarship to a student', ScholarshipResponseDto)
  awardScholarship(
    @Body() dto: AwardScholarshipDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.service.awardScholarship(caller, dto);
  }
}
