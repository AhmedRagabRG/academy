import 'reflect-metadata';
import {
  INestApplication,
  ValidationPipe,
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PermissionsGuard } from '../../../src/core/authorization/permissions.guard';
import {
  UnsupportedFileTypeException,
  ValidationException,
} from '../../../src/core/exceptions';
import { AllExceptionsFilter } from '../../../src/core/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from '../../../src/core/interceptors/response-envelope.interceptor';
import { AdmissionDocumentPolicyService } from '../../../src/modules/admissions/documents/admission-document-policy.service';
import { AdmissionDocumentController } from '../../../src/modules/admissions/documents/admission-document.controller';
import { AdmissionDocumentService } from '../../../src/modules/admissions/documents/admission-document.service';
import { AdmissionDocumentRepository } from '../../../src/modules/admissions/documents/admission-document.repository';
import { AdmissionService } from '../../../src/modules/admissions/admissions/admission.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';
import type { UploadedFile } from '../../../src/storage/storage.service.interface';
import { STORAGE_SERVICE } from '../../../src/storage/storage.service.interface';
import { sniffMimeType } from '../../../src/storage/file-signature';
import type { Request, Response, NextFunction } from 'express';

const admissionId = '0308c85f-d390-476d-bcb0-b95e605d05a6';
const documentId = '46c362bb-78fc-4ba6-a831-c9168e7cb7d8';
const requirementId = '7a0f5363-fbb8-4a76-8f85-5e55641d1a43';
const versionId = '98c04bdf-6998-4613-a2b5-ab29700371db';
const permissions = [
  'admissions.documents.view',
  'admissions.documents.manage',
  'admissions.documents.verify',
  'admissions.academic.manage',
];
const documentResponse = {
  id: documentId,
  admissionId,
  requirementId,
  requirementKey: 'national-id',
  state: 'pending',
  currentVersion: null,
  version: 1,
};
let storedCommand: unknown;

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Expected response object');
  return value as Record<string, unknown>;
}

const documentRepository = {
  list: jest.fn().mockResolvedValue([documentResponse]),
  findDocument: jest.fn().mockResolvedValue(documentResponse),
  findRequirement: jest.fn().mockResolvedValue({
    id: requirementId,
    stableKey: 'national-id',
    required: true,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maximumBytes: 5_000_000,
  }),
  findByIdempotencyKey: jest.fn().mockResolvedValue(null),
  storeVersion: jest.fn((command: unknown) => {
    storedCommand = command;
    return Promise.resolve(documentResponse);
  }),
  withdraw: jest.fn().mockResolvedValue({
    ...documentResponse,
    state: 'withdrawn',
  }),
  decide: jest.fn().mockResolvedValue({
    ...documentResponse,
    state: 'verified',
  }),
  versions: jest.fn().mockResolvedValue([{ id: versionId }]),
  refreshPolicy: jest.fn().mockResolvedValue([documentResponse]),
};
const storageService = {
  store: jest.fn((file: UploadedFile) => {
    const detected = sniffMimeType(file.buffer);
    if (!detected)
      throw new UnsupportedFileTypeException([
        'application/pdf',
        'image/jpeg',
        'image/png',
      ]);
    return Promise.resolve({
      id: 'stored-file',
      fileName: 'stored-file',
      originalName: file.originalname,
      mimeType: detected,
      size: file.size,
      url: '/files/stored-file',
    });
  }),
  retrieve: jest.fn(),
  remove: jest.fn().mockResolvedValue(undefined),
};
const policyService = {
  refresh: jest.fn().mockResolvedValue([documentResponse]),
};
const admissionService = {
  get: jest.fn().mockResolvedValue({ id: admissionId }),
};

@Module({
  controllers: [AdmissionDocumentController],
  providers: [
    AdmissionDocumentService,
    { provide: AdmissionDocumentRepository, useValue: documentRepository },
    { provide: STORAGE_SERVICE, useValue: storageService },
    { provide: AdmissionDocumentPolicyService, useValue: policyService },
    { provide: AdmissionService, useValue: admissionService },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
class DocumentTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        (
          req: Request & { caller?: CallerContext },
          _res: Response,
          next: NextFunction,
        ) => {
          req.caller = {
            accountId: '48fde538-c379-4f3b-a852-3f3d5948cfaf',
            displayName: 'Document Tester',
            email: 'tester@example.com',
            sessionId: 'session',
            roles: [],
            permissionKeys:
              typeof req.headers['x-test-permissions'] === 'string'
                ? req.headers['x-test-permissions'].split(',').filter(Boolean)
                : permissions,
            authorizedBranchIds: [],
            organizationWide: true,
            authenticatedAt: new Date().toISOString(),
          };
          next();
        },
      )
      .forRoutes('*');
  }
}

describe('Admission documents multipart contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DocumentTestModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: () => new ValidationException(),
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => jest.clearAllMocks());

  it('lists documents and their immutable versions', async () => {
    await request(app.getHttpServer())
      .get(`/admissions/${admissionId}/documents`)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ success: true }));
    await request(app.getHttpServer())
      .get(`/admissions/${admissionId}/documents/${documentId}/versions`)
      .expect(200)
      .expect(({ body }) =>
        expect(object(body).data).toEqual([{ id: versionId }]),
      );
  });

  it('parses a valid multipart PDF upload and coerces its version', async () => {
    await request(app.getHttpServer())
      .post(`/admissions/${admissionId}/documents`)
      .field('requirementId', requirementId)
      .field('idempotencyKey', 'multipart-upload-key')
      .field('expectedVersion', '3')
      .attach('file', Buffer.from('%PDF-1.7 admission'), {
        filename: 'national-id.pdf',
        contentType: 'application/pdf',
      })
      .expect(201)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          success: true,
          data: { id: documentId },
        }),
      );
    expect(storedCommand).toMatchObject({
      expectedVersion: 3,
      storageFile: {
        originalName: 'national-id.pdf',
        mimeType: 'application/pdf',
      },
    });
  });

  it('supports replace, withdraw, verification, and policy refresh actions', async () => {
    await request(app.getHttpServer())
      .post(`/admissions/${admissionId}/documents/${documentId}/replace`)
      .field('idempotencyKey', 'multipart-replace-key')
      .field('expectedVersion', '4')
      .attach('file', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
        filename: 'national-id.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/admissions/${admissionId}/documents/${documentId}/withdraw`)
      .send({
        documentVersionId: versionId,
        reason: 'Superseded',
        expectedVersion: 5,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/admissions/${admissionId}/documents/${documentId}/verify`)
      .send({ documentId, versionId, decision: 'verified', expectedVersion: 6 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/admissions/${admissionId}/documents/refresh-policy`)
      .send({ expectedVersion: 7 })
      .expect(201);
    expect(documentRepository.storeVersion).toHaveBeenCalledTimes(1);
    expect(documentRepository.withdraw).toHaveBeenCalledTimes(1);
    expect(documentRepository.decide).toHaveBeenCalledTimes(1);
    expect(policyService.refresh).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid metadata, oversized files, and missing permissions', async () => {
    await request(app.getHttpServer())
      .post(`/admissions/${admissionId}/documents`)
      .field('requirementId', 'not-a-uuid')
      .field('idempotencyKey', 'short')
      .field('expectedVersion', '0')
      .attach('file', Buffer.from('%PDF'), 'invalid.pdf')
      .expect(422);
    await request(app.getHttpServer())
      .post(`/admissions/${admissionId}/documents`)
      .field('requirementId', requirementId)
      .field('idempotencyKey', 'oversized-upload-key')
      .field('expectedVersion', '1')
      .attach('file', Buffer.alloc(5_000_001), 'too-large.pdf')
      .expect(413);
    await request(app.getHttpServer())
      .post(`/admissions/${admissionId}/documents`)
      .field('requirementId', requirementId)
      .field('idempotencyKey', 'spoofed-upload-key')
      .field('expectedVersion', '1')
      .attach('file', Buffer.from('not a real PDF'), {
        filename: 'spoofed.pdf',
        contentType: 'application/pdf',
      })
      .expect(422)
      .expect(({ body }) => {
        const error = object(object(body).error);
        expect(error.code).toBe('UNSUPPORTED_FILE_TYPE');
      });
    await request(app.getHttpServer())
      .post(`/admissions/${admissionId}/documents`)
      .set('x-test-permissions', 'admissions.documents.view')
      .field('requirementId', requirementId)
      .field('idempotencyKey', 'forbidden-upload-key')
      .field('expectedVersion', '1')
      .attach('file', Buffer.from('%PDF'), 'forbidden.pdf')
      .expect(403);
  });
});
