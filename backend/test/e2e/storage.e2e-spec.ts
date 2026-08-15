import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FileTooLargeException,
  FileUnreadableException,
  UnsupportedFileTypeException,
} from '../../src/core/exceptions';
import { LocalStorageService } from '../../src/storage/local-storage.service';
describe('storage acceptance matrix', () => {
  let directory: string;
  let service: LocalStorageService;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'alsalam-e2e-'));
    service = new LocalStorageService(
      new ConfigService({
        upload: { directory, publicBaseUrl: '/files', maxBytes: 8 },
      }),
    );
    await service.onModuleInit();
  });
  afterAll(() => rm(directory, { recursive: true, force: true }));
  it('trusts PNG bytes over a PDF name and prevents overwrites', async () => {
    const file = {
      originalname: 'same.pdf',
      mimetype: 'application/pdf',
      size: 4,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    };
    const first = await service.store(file, 'student-document');
    const second = await service.store(file, 'student-document');
    expect(first.mimeType).toBe('image/png');
    expect(first.fileName).not.toBe(second.fileName);
  });
  it('returns distinct refusals', async () => {
    await expect(
      service.store(
        { originalname: 'x', mimetype: 'x', size: 0, buffer: Buffer.alloc(0) },
        'student-document',
      ),
    ).rejects.toBeInstanceOf(FileUnreadableException);
    await expect(
      service.store(
        {
          originalname: 'x',
          mimetype: 'x',
          size: 9,
          buffer: Buffer.alloc(9, 1),
        },
        'student-document',
      ),
    ).rejects.toBeInstanceOf(FileTooLargeException);
    await expect(
      service.store(
        {
          originalname: 'x',
          mimetype: 'x',
          size: 3,
          buffer: Buffer.from('bad'),
        },
        'student-document',
      ),
    ).rejects.toBeInstanceOf(UnsupportedFileTypeException);
  });
});
