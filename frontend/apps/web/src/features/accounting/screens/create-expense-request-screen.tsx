"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { Card } from "@/shared/components/layout/card"
import { requestCopy } from "../config/accounting-copy"
import { accountingPermissions } from "../config/accounting-permissions"
import {
  emptyExpenseRequestValues,
  toCommandInput,
  type ExpenseRequestFormValues,
} from "../schemas/expense-request-schemas"
import {
  ExpenseRequestForm,
  validateExpenseRequest,
} from "../forms/expense-request-form"
import { useAccountingLookups } from "../hooks/use-accounting-lookups"
import { useCreateRequest } from "../hooks/use-expense-requests"
import { AccountingAreaState } from "../components/accounting-area-states"

export function CreateExpenseRequestScreen() {
  const router = useRouter()
  const lookups = useAccountingLookups()
  const create = useCreateRequest()
  const [values, setValues] = useState<ExpenseRequestFormValues>(
    emptyExpenseRequestValues
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const formRef = useRef<HTMLDivElement>(null)

  const options = lookups.data && {
    precision: lookups.data.precision,
    branches: lookups.data.branches,
    categories: lookups.data.categories.map((category) => ({
      id: category.id,
      name: category.name,
      status: category.status,
    })),
    subCategories: lookups.data.subCategories.map((subCategory) => ({
      id: subCategory.id,
      categoryId: subCategory.categoryId,
      name: subCategory.name,
      status: subCategory.status,
    })),
  }

  const save = () => {
    if (!options) return
    const result = validateExpenseRequest(values, options)
    if (!result.ok) {
      setErrors(result.errors)
      // Move focus to the first invalid field rather than leaving the user hunting.
      const first = Object.keys(result.errors)[0]
      if (first)
        formRef.current
          ?.querySelector<HTMLElement>(`[id$="-${first}"]`)
          ?.focus()
      return
    }
    setErrors({})
    create.mutate(
      { input: toCommandInput(values) },
      {
        onSuccess: (request) =>
          router.push(`/accounting/expense-requests/${request.id}`),
      }
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={requestCopy.create}
        actions={
          <Button onClick={save} disabled={create.isPending || !options}>
            <Save aria-hidden />
            {requestCopy.save}
          </Button>
        }
      />
      <AccountingAreaState
        permission={accountingPermissions.requestsCreate}
        loading={lookups.isLoading}
        error={lookups.error}
        onRetry={() => void lookups.refetch()}
        loadingLabel="جارٍ تحميل نموذج الطلب"
      >
        {options && (
          <div ref={formRef}>
            <Card>
              <ExpenseRequestForm
                values={values}
                errors={errors}
                options={options}
                onChange={setValues}
              />
            </Card>
            <p className="text-muted-foreground mt-4 text-sm">
              يُحفظ الطلب كمسودة أولًا، ثم يمكن تقديمه للمراجعة من صفحة الطلب.
            </p>
          </div>
        )}
      </AccountingAreaState>
    </PageContainer>
  )
}
