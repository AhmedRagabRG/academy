import { BatchPolicy } from '../../../src/modules/program-batches/batches/batch.policy';
import {
  InvalidTransitionException,
  ValidationException,
} from '../../../src/core/exceptions';

describe('BatchPolicy lifecycle', () => {
  const policy = new BatchPolicy();

  it.each([
    ['DRAFT', 'REGISTRATION_OPEN'],
    ['REGISTRATION_OPEN', 'REGISTRATION_CLOSED'],
    ['REGISTRATION_CLOSED', 'STUDYING'],
    ['STUDYING', 'GRADUATED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(() => policy.assertTransition(from, to)).not.toThrow();
  });

  it('rejects a forbidden edge', () => {
    expect(() => policy.assertTransition('DRAFT', 'GRADUATED')).toThrow(
      InvalidTransitionException,
    );
  });

  it('requires an archive reason', () => {
    expect(() => policy.assertTransition('DRAFT', 'ARCHIVED')).toThrow(
      ValidationException,
    );
  });

  it('uses correction permission for reopening', () => {
    expect(
      policy.requiredTransitionPermission(
        'REGISTRATION_CLOSED',
        'REGISTRATION_OPEN',
      ),
    ).toBe('batches.registration.correct');
  });
});
