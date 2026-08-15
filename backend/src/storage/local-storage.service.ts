import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FileDescriptor } from '../shared/types/file-descriptor';
import {
  FileTooLargeException,
  FileUnreadableException,
  UnsupportedFileTypeException,
} from '../core/exceptions';
import { sniffMimeType } from './file-signature';
import type {
  StorageService,
  UploadedFile,
  UploadPurpose,
} from './storage.service.interface';
import { uploadConstraint } from './upload.constraints';

/** The stored name's extension. A descriptor id alone does not locate a file. */
export function extensionFor(mimeType: string): string {
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'application/msword') return '.doc';
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return '.docx';
  if (mimeType === 'image/png') return '.png';
  return '.jpg';
}

@Injectable()
export class LocalStorageService implements StorageService, OnModuleInit {
  private readonly directory: string;
  private readonly publicBase: string;
  private readonly maxBytes: number;
  private readonly keys = new Map<string, FileDescriptor>();
  constructor(config: ConfigService) {
    this.directory = config.getOrThrow('upload.directory');
    this.publicBase = config.getOrThrow('upload.publicBaseUrl');
    this.maxBytes = config.getOrThrow('upload.maxBytes');
  }
  async onModuleInit(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await access(this.directory);
  }
  async store(
    file: UploadedFile,
    purpose: UploadPurpose,
    idempotencyKey?: string,
  ): Promise<FileDescriptor> {
    if (idempotencyKey && this.keys.has(idempotencyKey))
      return this.keys.get(idempotencyKey)!;
    const constraint = uploadConstraint(purpose, this.maxBytes);
    if (!file.buffer.length) throw new FileUnreadableException();
    if (file.size > constraint.maxBytes)
      throw new FileTooLargeException(constraint.maxBytes);
    const mimeType = sniffMimeType(file.buffer);
    if (!mimeType || !constraint.acceptedTypes.includes(mimeType))
      throw new UnsupportedFileTypeException(constraint.acceptedTypes);
    const id = randomUUID();
    const fileName = `${id}${extensionFor(mimeType)}`;
    await writeFile(join(this.directory, fileName), file.buffer, {
      flag: 'wx',
    });
    const descriptor = {
      id,
      fileName,
      originalName: file.originalname,
      mimeType,
      size: file.size,
      url: `${this.publicBase.replace(/\/$/, '')}/${fileName}`,
    };
    if (idempotencyKey) this.keys.set(idempotencyKey, descriptor);
    return descriptor;
  }
  publicUrl(id: string, mimeType: string): string {
    return `${this.publicBase.replace(/\/$/, '')}/${id}${extensionFor(mimeType)}`;
  }
  async retrieve(id: string): Promise<NodeJS.ReadableStream> {
    const files = await readFile(join(this.directory, id));
    return createReadStream(join(this.directory, id), {
      start: 0,
      end: files.length - 1,
    });
  }
  async remove(id: string): Promise<void> {
    await rm(join(this.directory, id), { force: true });
  }
}
