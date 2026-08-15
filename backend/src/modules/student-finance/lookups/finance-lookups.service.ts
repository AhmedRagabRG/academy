import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
} from '../../organization/types/organization-master-data.port';
import {
  ORGANIZATION_SETTINGS_PORT,
  type OrganizationSettingsPort,
} from '../../organization/types/organization-settings.port';
import {
  FINANCE_CHARGE_PURPOSE_GROUP,
  FINANCE_PAYMENT_METHOD_GROUP,
} from '../types/student-finance.types';
import {
  discountPolicy,
  DUE_POLICY,
  FINANCE_PRECISION,
  INSTALLMENT_ELIGIBILITY,
  INVOICE_STATUSES,
  REFUND_STATUSES,
  SCHOLARSHIP_POLICY,
} from './finance-policy.config';
import { DEFAULT_NUMBERING } from '../numbering/finance-numbering.service';

/**
 * One bounded, closed response describing everything a finance screen needs to
 * render its controls. Serving the policy figures from the same constants the
 * services enforce is what keeps an advertised cap and an applied cap equal.
 *
 * Inactive lookup values are returned rather than filtered, so a historical
 * record keeps its label instead of rendering a bare identifier.
 */
@Injectable()
export class FinanceLookupsService {
  constructor(
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly organization: OrganizationMasterDataPort,
    @Inject(ORGANIZATION_SETTINGS_PORT)
    private readonly settings: OrganizationSettingsPort,
  ) {}

  async all() {
    const [paymentMethods, chargePurposes, branches, financial] =
      await Promise.all([
        this.organization.selectableValues(FINANCE_PAYMENT_METHOD_GROUP),
        this.organization.selectableValues(FINANCE_CHARGE_PURPOSE_GROUP),
        this.organization.selectable('branch'),
        this.settings.financialDefaults(),
      ]);
    const { currency, precision } = financial;

    return {
      paymentMethods: paymentMethods.map(this.toOption),
      chargePurposes: chargePurposes.map(this.toOption),
      branches: branches.map(this.toOption),
      // Offerings and batches are display-only lookups owned by Catalog and
      // Program Batches; finance never prices from them.
      offerings: [],
      batches: [],
      invoiceStatuses: [...INVOICE_STATUSES],
      refundStatuses: [...REFUND_STATUSES],
      installmentEligibility: [...INSTALLMENT_ELIGIBILITY],
      discountPolicy: discountPolicy(currency, precision),
      scholarshipPolicy: SCHOLARSHIP_POLICY,
      numbering: {
        invoicePrefix: DEFAULT_NUMBERING.invoicePrefix,
        receiptPrefix: DEFAULT_NUMBERING.receiptPrefix,
        year: new Date().getUTCFullYear(),
        width: DEFAULT_NUMBERING.width,
      },
      duePolicy: DUE_POLICY,
      currency,
      precision,
    };
  }

  private toOption(value: {
    id: string;
    code?: string;
    label: string;
    active: boolean;
  }) {
    return {
      id: value.id,
      code: value.code ?? '',
      label: value.label,
      active: value.active,
    };
  }
}
