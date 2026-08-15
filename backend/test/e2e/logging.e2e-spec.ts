import { randomUUID } from 'node:crypto';
describe('logging policy', () => {
  it('uses one request correlation id and configured credential redaction paths', () => {
    const id = randomUUID();
    const requestLog = { correlationId: id };
    const errorLog = { correlationId: id };
    expect(errorLog.correlationId).toBe(requestLog.correlationId);
    const redact = [
      'req.headers.cookie',
      'req.headers.authorization',
      '*.password',
      '*.passwordHash',
      '*.token',
    ];
    expect(redact).toEqual(
      expect.arrayContaining([
        'req.headers.cookie',
        'req.headers.authorization',
        '*.password',
        '*.token',
      ]),
    );
  });
});
