import type { Money } from '../../../shared/types/money';

export const STUDENT_FINANCE_READER_PORT = Symbol(
  'STUDENT_FINANCE_READER_PORT',
);

export interface StudentFinancialSummary {
  totalFees: Money;
  paidAmount: Money;
  remainingBalance: Money;
  activeInstallments: number;
  asOf: string;
  sourceRevisionId: string;
}

export type StudentFinanceUnavailableReason =
  'finance-module-absent' | 'source-error' | 'timeout';

/**
 * Three-state result. The union exists precisely so "finance is down" never
 * renders as "owes nothing" — zeros are never substituted for a failed lookup.
 * The `forbidden` variant is produced by Students from the caller's
 * permissions before this port is consulted, so an unauthorized caller cannot
 * infer whether Finance is running.
 */
export type StudentFinanceReadResult =
  | { state: 'available'; summary: StudentFinancialSummary }
  | { state: 'unavailable'; reason: StudentFinanceUnavailableReason };

export interface StudentFinanceReaderPort {
  getSummary(studentId: string): Promise<StudentFinanceReadResult>;
}
