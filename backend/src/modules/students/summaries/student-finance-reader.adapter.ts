import { Injectable } from '@nestjs/common';
import type {
  StudentFinanceReaderPort,
  StudentFinanceReadResult,
} from '../types/student-finance-reader.port';

/**
 * Default reader used until Student Finance (module 009) ships its own
 * implementation against STUDENT_FINANCE_READER_PORT.
 *
 * This is not a mock: `finance-module-absent` is a documented reason in the
 * contract, so an absent Finance module is a specified state rather than a
 * stub. Swapping in the real reader requires no change to any service
 * (constitution Principle XVI).
 */
@Injectable()
export class AbsentStudentFinanceReader implements StudentFinanceReaderPort {
  // The student id is irrelevant while Finance is absent; the signature still
  // satisfies the port because a narrower parameter list is assignable.
  getSummary(): Promise<StudentFinanceReadResult> {
    return Promise.resolve({
      state: 'unavailable',
      reason: 'finance-module-absent',
    });
  }
}
