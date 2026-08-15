/**
 * The bridge between a file chosen in the UI and the multipart upload.
 *
 * `UploadAttachmentCommand` describes a file — name, type, size, and the
 * attempt token that makes a retry idempotent — but carries no bytes, because
 * the in-memory implementation never needed them. The API does.
 *
 * Rather than widen that command (and every caller and mock along with it),
 * the picker parks the `File` here under its attempt token and the upload
 * claims it by the same token. Keeping the registry in its own module is what
 * lets a component stage a file without importing the HTTP service.
 */
const pending = new Map<string, File>()

export function stagePendingUpload(uploadAttempt: string, file: File): void {
  pending.set(uploadAttempt, file)
}

/** Claims a staged file, removing it so a token is never spent twice. */
export function takePendingUpload(uploadAttempt: string): File | undefined {
  const file = pending.get(uploadAttempt)
  pending.delete(uploadAttempt)
  return file
}

export function clearPendingUploads(): void {
  pending.clear()
}
