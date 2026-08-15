"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { AdmissionDocument } from "../types/domain"
export function DocumentHistory({ document }: { document: AdmissionDocument }) {
  const [page, setPage] = useState(1)
  const pageSize = 5
  const versions = [...document.versions].reverse()
  const totalPages = Math.max(1, Math.ceil(versions.length / pageSize))
  const visible = versions.slice((page - 1) * pageSize, page * pageSize)
  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        سجل الإصدارات ({document.versions.length})
      </summary>
      <ol className="mt-3 space-y-2">
        {visible.map((version) => (
          <li key={version.id} className="text-xs text-muted-foreground">
            <bdi dir="ltr">
              v{version.versionNumber} · {version.fileName}
            </bdi>{" "}
            · {version.status}
          </li>
        ))}
      </ol>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            السابق
          </Button>
          <span>
            صفحة {page} من {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            التالي
          </Button>
        </div>
      )}
    </details>
  )
}
