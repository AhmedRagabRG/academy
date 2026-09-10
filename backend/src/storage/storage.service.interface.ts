import type { FileDescriptor } from '../shared/types/file-descriptor';
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
export type UploadPurpose =
  | 'catalog-asset'
  | 'organization-logo'
  | 'student-photo'
  | 'student-document'
  | 'admission-document'
  | 'expense-attachment'
  | 'ticket-attachment'
  | 'inbox-attachment'
  | 'knowledge-source';
export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
export interface StorageService {
  store(
    file: UploadedFile,
    purpose: UploadPurpose,
    idempotencyKey?: string,
  ): Promise<FileDescriptor>;
  retrieve(id: string): Promise<NodeJS.ReadableStream>;
  remove(id: string): Promise<void>;
  /**
   * Where a stored file is served from, rebuilt from what a caller kept.
   *
   * A module that recorded only the descriptor id cannot address the file
   * again — the stored name carries an extension the id does not. Rebuilding
   * the URL here keeps that naming rule inside storage instead of copying it
   * into every module that needs to link to its own uploads.
   */
  publicUrl(id: string, mimeType: string): string;
}
