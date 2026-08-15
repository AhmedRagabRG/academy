"use client"

import { useState } from "react"
import { Award } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Section } from "@/shared/components/layout/section"
import { Card } from "@/shared/components/layout/card"
import { usePermission } from "@/shared/hooks/use-permission"
import {
  financeCopy,
  profileCopy,
  scholarshipCopy,
  timelineCopy,
} from "../config/finance-copy"
import { financePermissions } from "../config/finance-permissions"
import { useStudentFinancialProfile } from "../hooks/use-financial-profile"
import { useFinanceLookups } from "../hooks/use-invoices"
import { useAwardScholarship } from "../hooks/use-reductions"
import { FinanceAreaState, FinanceBidiValue } from "../components/finance-area-states"
import { FinancialSummaryCards } from "../components/financial-summary-cards"
import { EnrollmentBalances } from "../components/enrollment-balances"
import { ScholarshipHistory } from "../components/scholarship-history"
import { AwardScholarshipDialog } from "../components/award-scholarship-dialog"
import { FinanceTimelineSection } from "../components/finance-timeline-section"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })

/**
 * The per-student financial workspace, contributed as a tab into the existing
 * student workspace rather than living at a second student route (research R7).
 */
export function StudentFinanceWorkspaceScreen({
  studentId,
}: {
  studentId: string
}) {
  const profile = useStudentFinancialProfile(studentId)
  const lookups = useFinanceLookups()
  const award = useAwardScholarship(studentId)
  const canAward = usePermission(financePermissions.scholarshipsApprove)
  const [awardOpen, setAwardOpen] = useState(false)

  return (
    <FinanceAreaState
      permission={financePermissions.view}
      loading={profile.isLoading}
      error={profile.error}
      onRetry={() => void profile.refetch()}
      loadingLabel="جارٍ تحميل الملف المالي"
    >
      {profile.data && (
        <div className="space-y-8">
          {/* A zero balance is stated as a fact only when it is one. */}
          {profile.data.hasNoRecords ? (
            <Card className="space-y-2">
              <p className="font-medium">{profileCopy.emptyTitle}</p>
              <p className="text-muted-foreground text-sm">
                {profileCopy.emptyDescription}
              </p>
            </Card>
          ) : (
            <>
              <FinancialSummaryCards profile={profile.data} />

              <Section title={profileCopy.perEnrollment}>
                <EnrollmentBalances balances={profile.data.perEnrollment} />
              </Section>

              <Section
                title={scholarshipCopy.title}
                action={
                  canAward &&
                  lookups.data && (
                    <Button variant="outline" onClick={() => setAwardOpen(true)}>
                      <Award aria-hidden />
                      {scholarshipCopy.award}
                    </Button>
                  )
                }
              >
                <ScholarshipHistory scholarships={profile.data.scholarships} />
              </Section>

              {profile.data.discounts.length > 0 && (
                <Section title="الخصومات">
                  <Card>
                    <ul className="space-y-2 text-sm">
                      {profile.data.discounts.map((discount) => (
                        <li key={discount.id}>
                          <FinanceBidiValue className="font-medium">
                            {discount.invoiceNumber}
                          </FinanceBidiValue>{" "}
                          — {discount.reason}{" "}
                          <span className="text-muted-foreground">
                            · اعتمدها {discount.approvedByName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </Section>
              )}
            </>
          )}

          <Section title={timelineCopy.title}>
            <FinanceTimelineSection studentId={studentId} />
          </Section>

          <p className="text-muted-foreground text-xs">
            {profileCopy.asOf}:{" "}
            <FinanceBidiValue>
              {dateFormatter.format(new Date(profile.data.asOf))}
            </FinanceBidiValue>{" "}
            · {financeCopy.noDeleteNotice}
          </p>
        </div>
      )}

      {profile.data && lookups.data && (
        <AwardScholarshipDialog
          open={awardOpen}
          pending={award.isPending}
          totalFees={profile.data.totals.totalFees}
          policy={lookups.data.scholarshipPolicy}
          enrollments={profile.data.perEnrollment}
          onClose={() => setAwardOpen(false)}
          onConfirm={(values) =>
            award.mutate(
              {
                studentId,
                name: values.name,
                kind: values.kind,
                value: values.value,
                coverage: values.coverage,
                reason: values.reason,
                enrollmentId: values.enrollmentId || undefined,
              },
              { onSuccess: () => setAwardOpen(false) }
            )
          }
        />
      )}
    </FinanceAreaState>
  )
}
