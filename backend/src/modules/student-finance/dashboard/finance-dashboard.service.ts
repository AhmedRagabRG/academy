import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/client';
import type { CallerContext } from '../../../shared/types/caller-context';
import { fromMinorUnits } from '../../../shared/utils/money.util';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import {
  ORGANIZATION_SETTINGS_PORT,
  type OrganizationSettingsPort,
} from '../../organization/types/organization-settings.port';
import { FinanceBalanceRepository } from '../balances/finance-balance.repository';
import {
  FINANCE_FALLBACK_CURRENCY,
  FINANCE_PRECISION,
} from '../lookups/finance-policy.config';
import type { ListInvoicesDto } from '../invoices/dto/list-invoices.dto';

/**
 * Totals cover every invoice matching the filters and branch scope — never a
 * page. The filter is built from the same inputs `GET /finance/invoices`
 * accepts, so a summary can never describe a different set than the list it
 * sits above.
 */
@Injectable()
export class FinanceDashboardService {
  constructor(
    private readonly balances: FinanceBalanceRepository,
    private readonly profile: OrganizationProfileService,
    @Inject(ORGANIZATION_SETTINGS_PORT)
    private readonly settings: OrganizationSettingsPort,
  ) {}

  async summary(caller: CallerContext, query: ListInvoicesDto) {
    const organizationId = (await this.profile.get()).organizationId;

    const conditions: Prisma.Sql[] = [
      Prisma.sql`i."organizationId" = ${organizationId}::uuid`,
    ];

    const branchIds = this.scopedBranchIds(caller, query.branchIds);
    if (branchIds) {
      if (branchIds.length === 0) {
        // The caller holds no branch at all; an empty IN () is invalid SQL and
        // the honest answer is "no records", not "everything".
        return this.emptySummary();
      }
      conditions.push(Prisma.sql`i."branchId" = ANY(${branchIds}::uuid[])`);
    }
    if (query.studentId) {
      conditions.push(Prisma.sql`i."studentId" = ${query.studentId}::uuid`);
    }
    if (query.purpose) {
      conditions.push(Prisma.sql`i."chargePurposeCode" = ${query.purpose}`);
    }
    if (query.search) {
      const like = `%${query.search}%`;
      conditions.push(
        Prisma.sql`(i."searchName" LIKE ${like} OR i."invoiceNumber" LIKE ${like} OR i."studentCode" LIKE ${like})`,
      );
    }

    const where = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const { currency, precision } = await this.settings.financialDefaults();
    const aggregate = await this.balances.aggregate(where, currency, precision);

    return {
      invoiced: fromMinorUnits(
        aggregate.invoicedMinor,
        aggregate.currency,
        aggregate.precision,
      ),
      collected: fromMinorUnits(
        aggregate.collectedMinor,
        aggregate.currency,
        aggregate.precision,
      ),
      outstanding: fromMinorUnits(
        aggregate.outstandingMinor,
        aggregate.currency,
        aggregate.precision,
      ),
      unsettledInvoices: aggregate.unsettledInvoices,
      // Cancelled invoices are excluded from the figures but still count as
      // records, so an all-cancelled set reports zeros rather than "no data".
      hasNoRecords: aggregate.matchedInvoices === 0,
      asOf: new Date().toISOString(),
    };
  }

  private emptySummary(
    currency = FINANCE_FALLBACK_CURRENCY,
    precision = FINANCE_PRECISION,
  ) {
    const zero = fromMinorUnits(0n, currency, precision);
    return {
      invoiced: zero,
      collected: zero,
      outstanding: zero,
      unsettledInvoices: 0,
      hasNoRecords: true,
      asOf: new Date().toISOString(),
    };
  }

  private scopedBranchIds(
    caller: CallerContext,
    requested?: string[],
  ): string[] | undefined {
    if (caller.organizationWide) return requested?.length ? requested : undefined;
    const allowed = caller.authorizedBranchIds;
    if (!requested?.length) return allowed;
    return requested.filter((id) => allowed.includes(id));
  }
}
