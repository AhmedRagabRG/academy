/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { BatchController } from '../../../src/modules/program-batches/batches/batch.controller';
import { BatchConsumerController } from '../../../src/modules/program-batches/batches/batch-consumer.controller';

describe('Program Batch authorization surface', () => {
  it.each([
    BatchController.prototype.list,
    BatchController.prototype.create,
    BatchController.prototype.lookups,
    BatchController.prototype.get,
    BatchController.prototype.update,
    BatchController.prototype.status,
    BatchController.prototype.readiness,
    BatchConsumerController.prototype.eligibility,
    BatchConsumerController.prototype.lifecycle,
    BatchConsumerController.prototype.revisions,
  ] as const)('is protected', (handler) => {
    const required = Reflect.getMetadata('requiredPermissions', handler) as
      string[] | undefined;
    expect(required?.length).toBeGreaterThan(0);
    expect(required?.every((key) => key.startsWith('batches.'))).toBe(true);
  });
});
