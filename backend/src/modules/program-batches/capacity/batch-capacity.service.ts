import { Inject, Injectable } from '@nestjs/common';
import { BatchDependencyUnavailableException } from '../../../core/exceptions';
import {
  BATCH_ENROLLMENT_DEPENDENCY_PORT,
  type BatchEnrollmentDependencyPort,
} from '../types/batch-reference.port';
import type { CapacityView } from '../types/program-batch.types';

@Injectable()
export class BatchCapacityService {
  constructor(
    @Inject(BATCH_ENROLLMENT_DEPENDENCY_PORT)
    private readonly enrollments: BatchEnrollmentDependencyPort,
  ) {}

  static derive(
    maximumStudents: number,
    currentStudents: number,
  ): CapacityView {
    const availableSeats = Math.max(0, maximumStudents - currentStudents);
    const status =
      currentStudents > maximumStudents
        ? 'OVER_CAPACITY'
        : availableSeats === 0
          ? 'FULL'
          : availableSeats * 10 <= maximumStudents
            ? 'NEARLY_FULL'
            : 'AVAILABLE';
    return { maximumStudents, currentStudents, availableSeats, status };
  }

  async forBatch(
    batchId: string,
    maximumStudents: number,
  ): Promise<CapacityView> {
    const result = await this.enrollments.currentStudents(batchId);
    if (!result.available) throw new BatchDependencyUnavailableException();
    return BatchCapacityService.derive(maximumStudents, result.value);
  }

  async hasDependencies(batchId: string): Promise<boolean> {
    const result = await this.enrollments.hasActiveDependencies(batchId);
    if (!result.available) throw new BatchDependencyUnavailableException();
    return result.value;
  }
}
