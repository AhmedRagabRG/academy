import { ConfigService } from '@nestjs/config';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FileUnreadableException,
  UnsupportedFileTypeException,
} from '../../src/core/exceptions';
import { LocalStorageService } from '../../src/storage/local-storage.service';
describe('LocalStorageService', () => {
  let directory: string;
  let service: LocalStorageService;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'alsalam-storage-'));
    service = new LocalStorageService(
      new ConfigService({
        upload: { directory, publicBaseUrl: '/files', maxBytes: 1024 },
      }),
    );
    await service.onModuleInit();
  });
  afterEach(() => rm(directory, { recursive: true, force: true }));
  it('sniffs content, preserves original name, avoids collisions, and honors idempotency', async () => {
    const file = {
      originalname: 'same.pdf',
      mimetype: 'text/plain',
      size: 4,
      buffer: Buffer.from('%PDF'),
    };
    const first = await service.store(file, 'student-document', 'key');
    const retry = await service.store(file, 'student-document', 'key');
    const second = await service.store(file, 'student-document');
    expect(retry).toEqual(first);
    expect(second.fileName).not.toBe(first.fileName);
    expect(first.mimeType).toBe('application/pdf');
    await expect(readFile(join(directory, first.fileName))).resolves.toEqual(
      file.buffer,
    );
  });
  it('rejects empty and unknown files distinctly', async () => {
    await expect(
      service.store(
        { originalname: 'x', mimetype: 'x', size: 0, buffer: Buffer.alloc(0) },
        'student-document',
      ),
    ).rejects.toBeInstanceOf(FileUnreadableException);
    await expect(
      service.store(
        {
          originalname: 'x.pdf',
          mimetype: 'application/pdf',
          size: 3,
          buffer: Buffer.from('bad'),
        },
        'student-document',
      ),
    ).rejects.toBeInstanceOf(UnsupportedFileTypeException);
  });
});
