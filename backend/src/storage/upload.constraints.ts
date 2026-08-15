import type { UploadPurpose } from './storage.service.interface';
export interface UploadConstraint {
  maxBytes: number;
  acceptedTypes: readonly string[];
}
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
  return {
    maxBytes: configuredMax,
    acceptedTypes:
      purpose === 'inbox-attachment'
        ? inboxDocuments
        : purpose === 'organization-logo' ||
            purpose === 'student-photo' ||
            purpose === 'catalog-asset'
          ? images
          : documents,
  };
}
