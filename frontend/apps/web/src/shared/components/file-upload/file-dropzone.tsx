"use client"
import { UploadCloud } from "lucide-react"
import { useDropzone, type Accept, type FileRejection } from "react-dropzone"
export function FileDropzone({
  onFiles,
  onReject,
  accept,
  maxSize = 5_000_000,
  label = "رفع الملفات",
  status,
  error,
  disabled = false,
}: {
  onFiles: (files: File[]) => void
  onReject?: (rejections: FileRejection[]) => void
  accept?: Accept
  maxSize?: number
  label?: string
  status?: string
  error?: string
  disabled?: boolean
}) {
  // A caller that cannot state a limit passes 0, and a default parameter does
  // not catch it — only `undefined` triggers the default. Forwarding the 0
  // makes react-dropzone reject every file, which looks to the user like
  // choosing a file did nothing at all. Treat it as "no client-side limit" and
  // leave the ceiling to the server, which re-validates every upload anyway.
  const limit = maxSize > 0 ? maxSize : undefined
  const dropzone = useDropzone({
    onDropAccepted: onFiles,
    onDropRejected: onReject,
    accept,
    ...(limit === undefined ? {} : { maxSize: limit }),
    disabled,
    noClick: true,
    noKeyboard: true,
  })
  return (
    <div>
      <div
        {...dropzone.getRootProps({
          role: "group",
          tabIndex: -1,
          "aria-label": `${label} بالسحب والإفلات`,
          "aria-disabled": disabled,
        })}
        className="rounded-xl border-2 border-dashed border-muted-foreground/40 p-8 text-center transition-colors outline-none hover:bg-muted/40 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      >
        <input {...dropzone.getInputProps()} />
        <UploadCloud className="mx-auto mb-3 size-8" aria-hidden />
        <button
          type="button"
          disabled={disabled}
          onClick={dropzone.open}
          className="rounded-md font-medium text-brand-blue outline-none focus-visible:ring-3 focus-visible:ring-brand-blue/30"
        >
          {label}
        </button>
        {limit !== undefined && (
          <p className="mt-1 text-xs text-muted-foreground">
            الحد الأقصى {Math.round(limit / 1_000_000)} ميجابايت
          </p>
        )}
      </div>
      {status && (
        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-xs text-muted-foreground"
        >
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
