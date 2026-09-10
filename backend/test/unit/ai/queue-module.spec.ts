import { QueueModule } from '../../../src/queue/queue.module';

jest.mock(
  '@nestjs/bullmq',
  () => ({
    BullModule: {
      forRoot: jest.fn(),
      registerQueue: jest.fn(),
    },
  }),
  { virtual: true },
);

const bullModule = jest.requireMock<{
  BullModule: {
    forRoot: jest.Mock;
    registerQueue: jest.Mock;
  };
}>('@nestjs/bullmq').BullModule;

describe('QueueModule', () => {
  beforeEach(() => jest.clearAllMocks());
  it('registers no BullMQ imports when the queue is disabled', () => {
    const registration = QueueModule.register({
      queueEnabled: false,
      redisUrl: 'redis://127.0.0.1:6379',
    });
    expect(registration.imports).toEqual([]);
    expect(registration.exports).toEqual([]);
    expect(bullModule.forRoot).not.toHaveBeenCalled();
    expect(bullModule.registerQueue).not.toHaveBeenCalled();
  });
  it('registers no BullMQ imports without a Redis URL', () => {
    const registration = QueueModule.register({
      queueEnabled: true,
      redisUrl: '',
    });
    expect(registration.imports).toEqual([]);
    expect(registration.exports).toEqual([]);
    expect(bullModule.forRoot).not.toHaveBeenCalled();
    expect(bullModule.registerQueue).not.toHaveBeenCalled();
  });
});
