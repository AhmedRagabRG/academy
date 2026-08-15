"use client"

import { useEffect, useRef } from "react"
import type { FieldErrors } from "react-hook-form"

interface FlatError {
  path: string
  message: string
}

/**
 * Walks the nested error tree react-hook-form produces for grouped fields
 * (`identity.primaryPhone`), so a message on a leaf is not lost behind the
 * section that contains it.
 */
function flatten(errors: FieldErrors, prefix = ""): FlatError[] {
  const collected: FlatError[] = []
  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === "object" && "message" in value && value.message)
      collected.push({ path, message: String(value.message) })
    else if (typeof value === "object")
      collected.push(...flatten(value as FieldErrors, path))
  }
  return collected
}

/**
 * Announces validation failures and moves focus to the first invalid field, so a
 * keyboard or screen-reader user is never left guessing why a save was refused.
 *
 * It lists the actual messages rather than a single "check the fields" line —
 * the generic sentence tells a user that something is wrong but not what, which
 * is the one thing they need in order to fix it.
 */
export function FormErrorSummary({
  errors,
  submitCount,
}: {
  errors: FieldErrors
  submitCount: number
}) {
  const headingRef = useRef<HTMLParagraphElement>(null)
  const flat = flatten(errors)

  useEffect(() => {
    if (submitCount === 0 || flat.length === 0) return
    headingRef.current?.focus()
    const first = document.getElementById(flat[0]!.path)
    first?.focus({ preventScroll: false })
  }, [submitCount, flat.length, flat])

  if (flat.length === 0) return null

  return (
    <section
      role="alert"
      className="border-destructive/40 bg-destructive/5 rounded-lg border p-4"
    >
      <p ref={headingRef} tabIndex={-1} className="font-medium outline-none">
        تعذر الحفظ. راجع {flat.length} من الحقول:
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
        {flat.map((error) => (
          <li key={error.path}>
            <a
              href={`#${error.path}`}
              className="underline underline-offset-4"
              onClick={(event) => {
                event.preventDefault()
                document.getElementById(error.path)?.focus()
              }}
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
