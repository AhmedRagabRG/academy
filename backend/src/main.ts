import {
  Logger as NestLogger,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import { json, static as serveStatic } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './core/interceptors/response-envelope.interceptor';
import { ValidationException, type ErrorDetail } from './core/exceptions';
import { API_PREFIX } from './shared/constants';

export function validationDetails(
  errors: ValidationError[],
  parent = '',
): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    return [
      ...Object.values(error.constraints ?? {}).map((message) => ({
        field,
        message,
      })),
      ...validationDetails(error.children ?? [], field),
    ];
  });
}
export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  app.useLogger(app.get(PinoLogger));
  app.use(cookieParser());
  app.use(
    json({
      verify: (req: Request & { rawBody?: Buffer }, _res, buffer) => {
        req.rawBody = Buffer.from(buffer);
      },
    }),
  );
  const csrf = doubleCsrf({
    getSecret: () => config.getOrThrow<string>('jwt.accessSecret'),
    getSessionIdentifier: (req) => {
      const cookies = req.cookies as Record<string, string> | undefined;
      return cookies?.access_token ?? req.ip ?? 'anonymous';
    },
    cookieName: 'csrf_token',
    cookieOptions: {
      httpOnly: true,
      secure: config.getOrThrow<boolean>('cookie.secure'),
      sameSite: config.getOrThrow('cookie.sameSite'),
    },
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
    errorConfig: {
      code: 'CSRF_INVALID',
      statusCode: 403,
      message: 'رمز الحماية غير صالح',
    },
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && req.path === `/${API_PREFIX}/auth/session`)
      res.setHeader('x-csrf-token', csrf.generateCsrfToken(req, res));
    next();
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === `/${API_PREFIX}/inbox/meta/webhook`) return next();
    return csrf.doubleCsrfProtection(req, res, next);
  });
  const origins = config.getOrThrow<string[]>('cors.origins');
  if (origins.includes('*'))
    throw new Error(
      'CORS_ORIGINS cannot contain * when credentials are enabled',
    );
  app.enableCors({
    credentials: true,
    origin: origins,
    exposedHeaders: ['x-csrf-token'],
  });
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new ValidationException(validationDetails(errors)),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.use(
    config.getOrThrow<string>('upload.publicBaseUrl'),
    serveStatic(
      join(process.cwd(), config.getOrThrow<string>('upload.directory')),
    ),
  );
  if (config.getOrThrow<boolean>('swagger.enabled')) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Al Salam Academy API')
        .setVersion('1.0')
        .addCookieAuth('access_token')
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }
  const port = config.getOrThrow<number>('app.port');
  await app.listen(port);
  new NestLogger('Bootstrap').log({
    environment: config.get<string>('app.nodeEnv'),
    port,
    documentation: config.get<boolean>('swagger.enabled') ? '/api/docs' : null,
  });
}
if (require.main === module) void bootstrap();
