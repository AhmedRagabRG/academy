import { Test } from '@nestjs/testing';

jest.mock(
  '@nestjs/bullmq',
  () => ({
    InjectQueue: jest.fn(() => () => undefined),
    Processor: jest.fn(() => () => undefined),
    WorkerHost: class {},
    BullModule: {
      forRoot: jest.fn(() => {
        throw new Error('BullMQ registration must remain inert');
      }),
      registerQueue: jest.fn(() => {
        throw new Error('BullMQ queue creation must remain inert');
      }),
    },
  }),
  { virtual: true },
);
jest.mock(
  'ioredis',
  () => ({
    __esModule: true,
    default: jest.fn(() => {
      throw new Error('Redis construction must remain inert');
    }),
  }),
  { virtual: true },
);
jest.mock(
  'openai',
  () => ({
    __esModule: true,
    default: jest.fn(() => {
      throw new Error('OpenAI construction must remain inert');
    }),
  }),
  { virtual: true },
);

describe('AI-disabled application startup', () => {
  it('compiles AppModule without Redis or OpenAI configuration', async () => {
    process.env.AI_ENABLED = 'false';
    process.env.AI_QUEUE_ENABLED = 'false';
    process.env.REDIS_URL = '';
    process.env.OPENAI_API_KEY = '';
    const { AppModule } = jest.requireActual<
      typeof import('../../../src/app.module')
    >('../../../src/app.module');
    const application = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    expect(application).toBeDefined();
    const redis = jest.requireMock<{ default: jest.Mock }>('ioredis');
    const openai = jest.requireMock<{ default: jest.Mock }>('openai');
    const bullModule = jest.requireMock<{
      BullModule: { forRoot: jest.Mock; registerQueue: jest.Mock };
    }>('@nestjs/bullmq').BullModule;
    expect(redis.default).not.toHaveBeenCalled();
    expect(openai.default).not.toHaveBeenCalled();
    expect(bullModule.forRoot).not.toHaveBeenCalled();
    expect(bullModule.registerQueue).not.toHaveBeenCalled();
    await application.close();
  });
});
