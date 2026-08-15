import { InvoiceLifecyclePolicy } from '../../../src/modules/student-finance/invoices/invoice-lifecycle.policy';
import type { InvoiceStatus } from '../../../src/modules/student-finance/types/student-finance.types';

describe('InvoiceLifecyclePolicy', () => {
  const policy = new InvoiceLifecyclePolicy();

  describe('editability', () => {
    it('permits figure edits only while the invoice is a draft', () => {
      expect(policy.isEditable('draft')).toBe(true);
      for (const status of [
        'issued',
        'partially-paid',
        'paid',
        'cancelled',
      ] as InvoiceStatus[]) {
        expect(policy.isEditable(status)).toBe(false);
        expect(() => policy.assertEditable(status)).toThrow(
          expect.objectContaining({ code: 'invoice-immutable', status: 409 }),
        );
      }
    });

    it('returns the permitted actions alongside the refusal', () => {
      // The client renders the remaining action surface from this, so an empty
      // or missing list would blank the buttons rather than disable them.
      try {
        policy.assertEditable('issued');
        fail('expected refusal');
      } catch (error) {
        expect(error).toMatchObject({
          code: 'invoice-immutable',
          fromStatus: 'issued',
          allowed: ['cancelled'],
        });
      }
    });
  });

  describe('issue', () => {
    it('issues only from draft', () => {
      expect(() => policy.assertCanIssue('draft')).not.toThrow();
      for (const status of [
        'issued',
        'partially-paid',
        'paid',
        'cancelled',
      ] as InvoiceStatus[]) {
        expect(() => policy.assertCanIssue(status)).toThrow(
          expect.objectContaining({ code: 'invoice-immutable' }),
        );
      }
    });
  });

  describe('cancel', () => {
    it('cancels a draft, issued or partially-paid invoice that carries no money', () => {
      for (const status of [
        'draft',
        'issued',
        'partially-paid',
      ] as InvoiceStatus[]) {
        expect(() => policy.assertCanCancel(status, 0n, '0.00')).not.toThrow();
      }
    });

    it('refuses once money has been collected, and says how much', () => {
      // Reversing a collected invoice would orphan the payment. The correction
      // is a refund, which leaves the payment record intact.
      try {
        policy.assertCanCancel('partially-paid', 600000n, '6000.00');
        fail('expected refusal');
      } catch (error) {
        expect(error).toMatchObject({
          code: 'invoice-has-payments',
          status: 409,
          collected: '6000.00',
        });
      }
    });

    it('treats paid and cancelled as terminal', () => {
      for (const status of ['paid', 'cancelled'] as InvoiceStatus[]) {
        expect(policy.allowedFrom(status)).toEqual([]);
        expect(() => policy.assertCanCancel(status, 0n, '0.00')).toThrow(
          expect.objectContaining({ code: 'invoice-immutable' }),
        );
      }
    });

    it('checks the transition before the payment guard', () => {
      // A fully paid invoice must fail as terminal, not as "has payments" —
      // the two refusals mean different things to the caller.
      try {
        policy.assertCanCancel('paid', 1800000n, '18000.00');
        fail('expected refusal');
      } catch (error) {
        expect(error).toMatchObject({ code: 'invoice-immutable', allowed: [] });
      }
    });
  });

  describe('payability', () => {
    it('accepts money only against an issued or partially-paid invoice', () => {
      expect(() => policy.assertPayable('issued')).not.toThrow();
      expect(() => policy.assertPayable('partially-paid')).not.toThrow();
      for (const status of ['draft', 'cancelled', 'paid'] as InvoiceStatus[]) {
        expect(() => policy.assertPayable(status)).toThrow(
          expect.objectContaining({
            code: 'invoice-not-payable',
            status: 409,
          }),
        );
      }
    });

    it('refuses a plan on a draft or cancelled invoice', () => {
      expect(() => policy.assertPlannable('issued')).not.toThrow();
      expect(() => policy.assertPlannable('partially-paid')).not.toThrow();
      expect(() => policy.assertPlannable('draft')).toThrow();
      expect(() => policy.assertPlannable('cancelled')).toThrow();
    });
  });

  it('never offers a derived status as a transition target', () => {
    // partially-paid and paid are consequences of recorded money. Offering
    // either as a target would let a caller assert a balance it has not
    // collected.
    for (const status of [
      'draft',
      'issued',
      'partially-paid',
      'paid',
      'cancelled',
    ] as InvoiceStatus[]) {
      expect(policy.allowedFrom(status)).not.toContain('paid');
      expect(policy.allowedFrom(status)).not.toContain('partially-paid');
    }
  });
});
