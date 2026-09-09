import {
  MAX_ATTEMPTS,
  retryBackoffMs,
} from '../../../src/modules/campaigns/dispatch/campaign-dispatcher.service';

describe('campaign dispatcher retry backoff', () => {
  it('grows exponentially and is capped', () => {
    const delays = Array.from({ length: MAX_ATTEMPTS + 2 }, (_, index) =>
      retryBackoffMs(index + 1),
    );
    for (let index = 1; index < delays.length; index += 1)
      expect(delays[index]).toBeGreaterThanOrEqual(delays[index - 1]);
    expect(new Set(delays).size).toBeGreaterThan(1);
    expect(Math.max(...delays)).toBeLessThanOrEqual(30 * 60_000);
  });

  it('never returns a non-positive delay', () => {
    expect(retryBackoffMs(0)).toBeGreaterThan(0);
    expect(retryBackoffMs(-5)).toBeGreaterThan(0);
  });
});
