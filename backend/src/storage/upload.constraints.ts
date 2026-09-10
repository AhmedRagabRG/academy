import type { UploadPurpose } from './storage.service.interface';
export interface UploadConstraint {
  maxBytes: number;
  acceptedTypes: readonly string[];
}
export const KNOWLEDGE_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
export function uploadConstraint(
  purpose: UploadPurpose,
  configuredMax: number,
): UploadConstraint {
  const images = ['image/jpeg', 'image/png'] as const;
  const documents = ['application/pdf', ...images] as const;
  const inboxDocuments = [
    ...documents,
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as const;
  const knowledgeDocuments = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
  ] as const;
  return {
    maxBytes:
      purpose === 'knowledge-source'
        ? KNOWLEDGE_SOURCE_MAX_BYTES
        : configuredMax,
    acceptedTypes:
      purpose === 'inbox-attachment'
        ? inboxDocuments
        : purpose === 'knowledge-source'
          ? knowledgeDocuments
          : purpose === 'organization-logo' ||
              purpose === 'student-photo' ||
              purpose === 'catalog-asset'
            ? images
            : documents,
  };
}
