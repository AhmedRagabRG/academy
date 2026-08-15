"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { FormWrapper } from "@/shared/components/forms/form-wrapper"
import { Card } from "@/shared/components/layout/card"
import type { StudentId } from "../types/common"
import type { StudentProfileInput } from "../types/commands"
import { createStudentProfileSchema } from "../schemas/student-profile-schema"
import { studentsCopy } from "../config/students-copy"
import { studentsPermissions } from "../config/students-permissions"
import { useStudentDetail } from "../hooks/use-student-detail"
import { useStudentLookups } from "../hooks/use-students-list"
import { useUpdateStudentProfile } from "../hooks/use-student-mutations"
import { StudentPersonalFields } from "../forms/student-personal-fields"
import { StudentAssignmentFields } from "../forms/student-assignment-fields"
import { StudentProtectedFields } from "../forms/student-protected-fields"
import { StudentFormErrorSummary } from "../components/student-form-error-summary"
import { StudentAreaState } from "../components/student-area-states"

const TODAY = "2026-07-31T00:00:00.000Z"

export function EditStudentScreen({ studentId }: { studentId: string }) {
  const id = studentId as StudentId
  const router = useRouter()
  const detail = useStudentDetail(id)
  const lookups = useStudentLookups()
  const [conflict, setConflict] = useState<number>()

  const schema = useMemo(
    () =>
      lookups.data
        ? createStudentProfileSchema(lookups.data.identityRules, TODAY)
        : undefined,
    [lookups.data]
  )

  const form = useForm<StudentProfileInput>({
    resolver: schema ? zodResolver(schema) : undefined,
    mode: "onSubmit",
  })

  // Seed the form once the record arrives; later refetches must not clobber input.
  const { reset } = form
  useEffect(() => {
    if (!detail.data) return
    reset({
      identity: detail.data.identity,
      assignment: detail.data.assignment,
    })
  }, [detail.data?.id, reset, detail.data])

  const update = useUpdateStudentProfile({
    onConflict: (state) => setConflict(state.currentVersion),
    onSuccess: () => router.push(`/students/${studentId}`),
  })

  const archived = detail.data?.status === "archived"

  return (
    <StudentAreaState
      permission={studentsPermissions.update}
      loading={detail.isLoading || lookups.isLoading}
      error={detail.error ?? lookups.error}
      onRetry={() => void detail.refetch()}
      loadingLabel="جارٍ تحميل بيانات الطالب"
    >
      {detail.data && lookups.data && (
        <div className="space-y-6">
          {archived ? (
            <Card className="space-y-4">
              <p role="status">{studentsCopy.archivedReadOnly}</p>
              <Button
                variant="outline"
                onClick={() => router.push(`/students/${studentId}`)}
              >
                العودة إلى ملف الطالب
              </Button>
            </Card>
          ) : (
            <FormWrapper
              form={form}
              pending={update.isPending}
              onSubmit={(values) =>
                update.mutate({
                  studentId: id,
                  input: values,
                  expectedVersion: detail.data!.version,
                })
              }
            >
              <StudentFormErrorSummary
                errors={form.formState.errors}
                submitCount={form.formState.submitCount}
              />

              {conflict !== undefined && (
                <section
                  role="alert"
                  className="border-destructive/40 bg-destructive/5 space-y-3 rounded-lg border p-4"
                >
                  <p>{studentsCopy.conflict}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConflict(undefined)
                      void detail.refetch()
                    }}
                  >
                    تحديث البيانات
                  </Button>
                </section>
              )}

              <StudentPersonalFields lookups={lookups.data} today={TODAY} />
              <StudentAssignmentFields lookups={lookups.data} />
              <StudentProtectedFields
                studentCode={detail.data.studentCode}
                system={detail.data.system}
              />

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? "جارٍ الحفظ..." : studentsCopy.save}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/students/${studentId}`)}
                >
                  {studentsCopy.cancel}
                </Button>
              </div>
            </FormWrapper>
          )}
        </div>
      )}
    </StudentAreaState>
  )
}
