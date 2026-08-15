import { EMPTY_CALLER_CONTEXT } from '../../../src/shared/types/caller-context';
import type { StorageService } from '../../../src/storage/storage.service.interface';
import { AdmissionDocumentService } from '../../../src/modules/admissions/documents/admission-document.service';
import type {
  AdmissionDocumentRecord,
  DecideDocumentCommand,
  DocumentVersionRecord,
  StoreDocumentVersionCommand,
  WithdrawDocumentCommand,
} from '../../../src/modules/admissions/documents/admission-document.repository';
import { AdmissionDocumentRepository } from '../../../src/modules/admissions/documents/admission-document.repository';
import type { DocumentRequirementRule } from '../../../src/modules/admissions/documents/admission-document.policy';
import { AdmissionDocumentDecisionDtoValue } from '../../../src/modules/admissions/documents/dto/admission-document.dto';

class RepositoryStub extends AdmissionDocumentRepository {
  readonly requirement: DocumentRequirementRule = {
    id: '7a0f5363-fbb8-4a76-8f85-5e55641d1a43',
    stableKey: 'national-id',
    required: true,
    allowedMimeTypes: ['application/pdf'],
    maximumBytes: 100,
  };
  result: AdmissionDocumentRecord = {
    id: '46c362bb-78fc-4ba6-a831-c9168e7cb7d8',
    admissionId: '0308c85f-d390-476d-bcb0-b95e605d05a6',
    requirementId: this.requirement.id,
    requirementKey: this.requirement.stableKey,
    requirement: null,
    state: 'pending',
    currentVersion: null,
    version: 1,
  };
  replay: DocumentVersionRecord | null = null;
  failStore = false;

  list(): Promise<AdmissionDocumentRecord[]> {
    return Promise.resolve([this.result]);
  }
  findDocument(): Promise<AdmissionDocumentRecord | null> {
    return Promise.resolve(this.result);
  }
  findRequirement(): Promise<DocumentRequirementRule | null> {
    return Promise.resolve(this.requirement);
  }
  findByIdempotencyKey(): Promise<DocumentVersionRecord | null> {
    return Promise.resolve(this.replay);
  }
  storeVersion(
    command: StoreDocumentVersionCommand,
  ): Promise<AdmissionDocumentRecord> {
    void command;
    if (this.failStore) return Promise.reject(new Error('database failure'));
    return Promise.resolve(this.result);
  }
  withdraw(command: WithdrawDocumentCommand): Promise<AdmissionDocumentRecord> {
    void command;
    return Promise.resolve(this.result);
  }
  decide(command: DecideDocumentCommand): Promise<AdmissionDocumentRecord> {
    void command;
    return Promise.resolve(this.result);
  }
  versions(): Promise<DocumentVersionRecord[]> {
    return Promise.resolve([]);
  }
  refreshPolicy(): Promise<AdmissionDocumentRecord[]> {
    return Promise.resolve([this.result]);
  }
}

describe('AdmissionDocumentService', () => {
  const caller = {
    ...EMPTY_CALLER_CONTEXT,
    accountId: '48fde538-c379-4f3b-a852-3f3d5948cfaf',
    displayName: 'Reviewer',
  };
  const file = {
    originalname: 'national-id.pdf',
    mimetype: 'application/pdf',
    size: 4,
    buffer: Buffer.from('%PDF'),
  };
  let repository: RepositoryStub;
  let storage: jest.Mocked<StorageService>;
  let service: AdmissionDocumentService;

  beforeEach(() => {
    repository = new RepositoryStub();
    storage = {
      store: jest.fn().mockResolvedValue({
        id: 'stored-id',
        fileName: 'stored-id.pdf',
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: '/uploads/stored-id.pdf',
      }),
      retrieve: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
      publicUrl: jest.fn((id: string, _mimeType: string) => `/files/${id}.pdf`),
    };
    service = new AdmissionDocumentService(repository, storage);
  });

  it('stores a file before committing its immutable version metadata', async () => {
    await expect(
      service.upload(
        repository.result.admissionId,
        {
          requirementId: repository.requirement.id,
          idempotencyKey: 'upload-key',
          expectedVersion: 1,
        },
        file,
        caller,
      ),
    ).resolves.toBe(repository.result);
    expect(storage.store.mock.calls).toContainEqual([
      file,
      'admission-document',
      `${repository.result.admissionId}:upload-key`,
    ]);
  });

  it('compensates storage when the database write fails', async () => {
    repository.failStore = true;
    await expect(
      service.upload(
        repository.result.admissionId,
        {
          requirementId: repository.requirement.id,
          idempotencyKey: 'upload-key',
          expectedVersion: 1,
        },
        file,
        caller,
      ),
    ).rejects.toThrow('database failure');
    expect(storage.remove.mock.calls).toContainEqual(['stored-id']);
  });

  it('returns a durable idempotent replay without writing storage again', async () => {
    repository.replay = {
      id: '98c04bdf-6998-4613-a2b5-ab29700371db',
      documentId: repository.result.id,
      status: 'available',
      mimeType: 'application/pdf',
      byteSize: 4,
      versionNumber: 1,
      storageFile: {
        id: 'stored-id',
        fileName: 'stored-id.pdf',
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: '/uploads/stored-id.pdf',
      },
      originalName: file.originalname,
      decisions: [],
      uploadedAt: new Date('2026-08-03T00:00:00Z'),
    };
    await expect(
      service.upload(
        repository.result.admissionId,
        {
          requirementId: repository.requirement.id,
          idempotencyKey: 'upload-key',
          expectedVersion: 1,
        },
        file,
        caller,
      ),
    ).resolves.toBe(repository.result);
    expect(storage.store.mock.calls).toHaveLength(0);
  });

  it('rejects a verification request whose body document differs from route', async () => {
    await expect(
      service.verify(
        repository.result.admissionId,
        repository.result.id,
        {
          documentId: '55bfb55d-bf00-4e92-88cd-14551986f33e',
          versionId: '058806a8-690c-4e09-9eef-c434a61892fc',
          decision: AdmissionDocumentDecisionDtoValue.VERIFIED,
          expectedVersion: 1,
        },
        caller,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
