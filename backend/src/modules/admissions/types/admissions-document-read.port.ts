export const ADMISSIONS_DOCUMENT_READ_PORT = Symbol(
  'ADMISSIONS_DOCUMENT_READ_PORT',
);

/**
 * One current admission document, flattened to the file facts a consumer needs
 * in order to take ownership of a copy. It deliberately carries no requirement
 * policy internals and no verification decisions — those stay inside Admissions.
 */
export interface AdmissionDocumentSnapshot {
  requirementKey: string;
  sourceDocumentId: string;
  sourceVersionId: string;
  storageFileId: string;
  fileDescriptor: Record<string, unknown>;
  originalName: string;
  mimeType: string;
  byteSize: number;
  previewLocator?: string;
  uploadedAt: string;
  uploadedById: string;
}

/**
 * Read-only view of an admission's current documents, published so Student
 * Management can copy them at intake without touching Admissions storage
 * (constitution Principle II; spec FR-009).
 */
export interface AdmissionsDocumentReadPort {
  listCurrentDocuments(
    admissionId: string,
  ): Promise<AdmissionDocumentSnapshot[]>;
}
