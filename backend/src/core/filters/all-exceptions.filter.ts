import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  DomainException,
  FileTooLargeException,
  UnsupportedFileTypeException,
  VersionConflictException,
} from '../exceptions';

/**
 * An error raised by middleware that predates Nest's exception types.
 *
 * `csrf-csrf` rejects a bad token with an `http-errors` object rather than an
 * `HttpException`, so without this it falls through to the generic branch and
 * a client is told "unexpected error" with a 500. The 403 and the
 * `CSRF_INVALID` code configured in `main.ts` never reached the caller, which
 * is precisely what a client needs in order to re-prime its token and retry.
 */
interface HttpErrorLike {
  statusCode: number;
  message: string;
  code?: string;
  expose?: boolean;
}

function asHttpError(exception: unknown): HttpErrorLike | null {
  if (typeof exception !== 'object' || exception === null) return null;
  const candidate = exception as Partial<HttpErrorLike> & { status?: number };
  const statusCode = candidate.statusCode ?? candidate.status;
  // Only client errors are surfaced verbatim; a 5xx from middleware is still a
  // fault we should log rather than describe to the caller.
  if (
    typeof statusCode !== 'number' ||
    statusCode < 400 ||
    statusCode > 499 ||
    typeof candidate.message !== 'string'
  )
    return null;
  return {
    statusCode,
    message: candidate.message,
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request & { id?: string }>();
    let status = 500;
    let error: Record<string, unknown> = {
      code: 'INTERNAL_ERROR',
      message: 'حدث خطأ غير متوقع',
    };
    if (exception instanceof DomainException) {
      status = exception.status;
      error = {
        code: exception.code,
        message: exception.message,
        ...(exception.details ? { details: exception.details } : {}),
      };
      if (exception instanceof VersionConflictException)
        error.currentVersion = exception.currentVersion;
      if (exception instanceof FileTooLargeException)
        error.limit = String(exception.limit);
      if (exception instanceof UnsupportedFileTypeException)
        error.acceptedTypes = exception.acceptedTypes.join(', ');
    } else if (exception instanceof HttpException) {
      status = exception.getStatus() === 400 ? 422 : exception.getStatus();
      const body = exception.getResponse();
      error = {
        code:
          status === 404
            ? 'NOT_FOUND'
            : status === 422
              ? 'VALIDATION_ERROR'
              : `HTTP_${status}`,
        message:
          typeof body === 'string'
            ? body
            : status === 404
              ? 'المسار غير موجود'
              : 'تعذر تنفيذ الطلب',
      };
    } else {
      const httpError = asHttpError(exception);
      if (httpError) {
        status = httpError.statusCode;
        error = {
          code: httpError.code ?? `HTTP_${status}`,
          message: httpError.message,
        };
      } else {
        this.logger.error({ err: exception, correlationId: request.id });
      }
    }
    response
      .status(status)
      .type('application/json; charset=utf-8')
      .json({ success: false, error });
  }
}
