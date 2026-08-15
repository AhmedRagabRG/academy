"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Save } from "lucide-react"
import { PageContainer } from "@/shared/components/layout/page-container"
import { Card } from "@/shared/components/layout/card"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import {
  documentRequirementsService,
  type DocumentPolicyModule,
  type DocumentRequirement,
} from "../services/document-requirements-service"

const MODULES: { value: DocumentPolicyModule; label: string }[] = [
  { value: "admissions", label: "طلبات القبول" },
  { value: "students", label: "الطلاب" },
]

const formatMb = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`

/**
 * The editable document lists.
 *
 * "مطلوب" is nested under "مُفعّل" on purpose: a document that is not asked
 * for cannot meaningfully be required, so disabling the type disables the
 * required box with it rather than leaving a contradictory pair checked.
 */
export function DocumentRequirementsScreen() {
  const [module, setModule] = useState<DocumentPolicyModule>("admissions")
  const [draft, setDraft] = useState<DocumentRequirement[] | null>(null)
  const client = useQueryClient()

  const policy = useQuery({
    queryKey: ["settings", "document-requirements", module],
    queryFn: ({ signal }) => documentRequirementsService.get(module, undefined, signal),
  })

  // The server's list is the starting point for every edit, and a save issues a
  // new version — so the draft is rebased whenever the module or the version
  // changes. Adjusting state during render rather than in an effect avoids the
  // extra render pass a `setState` inside `useEffect` would cost.
  const [basis, setBasis] = useState<string | null>(null)
  const serverBasis = policy.data ? `${module}:${policy.data.version}` : null
  if (serverBasis && serverBasis !== basis && policy.data) {
    setBasis(serverBasis)
    setDraft(policy.data.requirements)
  }

  const save = useMutation({
    mutationFn: (requirements: DocumentRequirement[]) =>
      documentRequirementsService.update({
        module,
        expectedVersion: policy.data?.version ?? 1,
        requirements,
      }),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: ["settings", "document-requirements", module],
      }),
  })

  const patch = (stableKey: string, changes: Partial<DocumentRequirement>) =>
    setDraft((current) =>
      (current ?? []).map((row) =>
        row.stableKey === stableKey ? { ...row, ...changes } : row
      )
    )

  const dirty =
    draft !== null &&
    policy.data !== undefined &&
    JSON.stringify(draft) !== JSON.stringify(policy.data.requirements)

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-brand-navy dark:text-foreground">
            المستندات المطلوبة
          </h1>
          <p className="text-muted-foreground text-sm">
            تحديد المستندات التي تطلبها كل وحدة، وأيها إلزامي. التغيير يسري على
            السجلات الجديدة فورًا.
          </p>
        </div>

        <div role="tablist" aria-label="الوحدة" className="flex gap-2">
          {MODULES.map((entry) => (
            <Button
              key={entry.value}
              role="tab"
              aria-selected={module === entry.value}
              variant={module === entry.value ? "default" : "outline"}
              onClick={() => setModule(entry.value)}
            >
              {entry.label}
            </Button>
          ))}
        </div>

        {policy.isLoading && <LoadingState />}
        {policy.error && (
          <ErrorState
            message="تعذر تحميل المستندات المطلوبة."
            onRetry={() => void policy.refetch()}
          />
        )}

        {draft && (
          <Card>
            <table className="w-full text-sm">
              <caption className="sr-only">
                المستندات المطلوبة لوحدة {MODULES.find((m) => m.value === module)?.label}
              </caption>
              <thead>
                <tr className="border-b text-start">
                  <th scope="col" className="p-3 text-start font-medium">
                    المستند
                  </th>
                  <th scope="col" className="p-3 text-start font-medium">
                    مُفعّل
                  </th>
                  <th scope="col" className="p-3 text-start font-medium">
                    مطلوب
                  </th>
                  <th scope="col" className="p-3 text-start font-medium">
                    الحد الأقصى
                  </th>
                </tr>
              </thead>
              <tbody>
                {draft.map((row) => (
                  <tr key={row.stableKey} className="border-b last:border-0">
                    <td className="p-3">
                      <span className="font-medium">{row.label}</span>
                      <span className="text-muted-foreground block text-xs">
                        <bdi dir="ltr">{row.stableKey}</bdi>
                      </span>
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={row.enabled}
                        aria-label={`إظهار ${row.label}`}
                        onChange={(event) =>
                          patch(row.stableKey, {
                            enabled: event.target.checked,
                            // Turning a document off cannot leave it required.
                            required: event.target.checked && row.required,
                          })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={row.required}
                        disabled={!row.enabled}
                        aria-label={`جعل ${row.label} إلزاميًا`}
                        onChange={(event) =>
                          patch(row.stableKey, { required: event.target.checked })
                        }
                      />
                    </td>
                    <td className="text-muted-foreground p-3">
                      {formatMb(row.maximumBytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {save.error && (
          <p role="alert" className="text-destructive text-sm">
            تعذر الحفظ. حدّث الصفحة ثم أعد المحاولة.
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={() => draft && save.mutate(draft)}
            disabled={!dirty || save.isPending}
          >
            <Save aria-hidden />
            {save.isPending ? "جارٍ الحفظ" : "حفظ"}
          </Button>
          {save.isSuccess && !dirty && (
            <span role="status" className="text-muted-foreground text-sm">
              تم الحفظ.
            </span>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
