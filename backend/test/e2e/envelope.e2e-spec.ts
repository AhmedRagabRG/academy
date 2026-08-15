import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ResponseEnvelopeInterceptor } from '../../src/core/interceptors/response-envelope.interceptor';
describe('response envelope contract', () => {
  const interceptor = new ResponseEnvelopeInterceptor();
  const context = {} as ExecutionContext;
  it('wraps single data', async () =>
    expect(
      await firstValueFrom(
        interceptor.intercept(context, {
          handle: () => of({ id: '1' }),
        } as CallHandler),
      ),
    ).toEqual({ success: true, data: { id: '1' } }));
  it('maps a page to list data and response meta', async () =>
    expect(
      await firstValueFrom(
        interceptor.intercept(context, {
          handle: () =>
            of({
              items: [],
              total: 137,
              page: 99,
              pageSize: 20,
              totalPages: 7,
            }),
        } as CallHandler),
      ),
    ).toEqual({
      success: true,
      data: [],
      meta: { total: 137, page: 99, limit: 20, totalPages: 7 },
    }));
});
