import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const BATCH_ENROLLMENT_DEPENDENCY_PORT = Symbol(
  'BATCH_ENROLLMENT_DEPENDENCY_PORT',
);

export type DependencyResult<T> =
  { available: true; value: T } | { available: false };

export interface BatchEnrollmentDependencyPort {
  currentStudents(batchId: string): Promise<DependencyResult<number>>;
  hasActiveDependencies(batchId: string): Promise<DependencyResult<boolean>>;
}

@Injectable()
export class EmptyBatchEnrollmentDependency implements BatchEnrollmentDependencyPort {
  constructor(private readonly config: ConfigService) {}

  currentStudents(): Promise<DependencyResult<number>> {
    return Promise.resolve(
      this.config.get<string>('app.nodeEnv') === 'production'
        ? { available: false }
        : { available: true, value: 0 },
    );
  }

  hasActiveDependencies(): Promise<DependencyResult<boolean>> {
    return Promise.resolve(
      this.config.get<string>('app.nodeEnv') === 'production'
        ? { available: false }
        : { available: true, value: false },
    );
  }
}
