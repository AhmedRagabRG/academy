"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { InvoiceId } from "../types/common"
import type {
  CancelInvoiceCommand,
  FinanceDashboardQuery,
  InvoiceListQuery,
  IssueInvoiceCommand,
  RaiseInvoicesCommand,
  UpdateDraftInvoiceCommand,
} from "../types/commands"
import type { FinanceError } from "../services/finance-error"
import { studentFinanceService } from "../services/active-student-finance-service"
import {
  financeKeys,
  invalidationTargets,
} from "../services/finance-query-keys"
import { financeCopy } from "../config/finance-copy"
import { useFinanceScopeFingerprint } from "./use-finance-scope"

export function useInvoices(query: InvoiceListQuery) {
  const fingerprint = useFinanceScopeFingerprint()
  return useQuery({
    queryKey: financeKeys.invoices(fingerprint, query),
    queryFn: ({ signal }) => studentFinanceService.listInvoices(query, signal),
    placeholderData: (previous) => previous,
  })
}

/**
 * Collection totals across every invoice in scope.
 *
 * A dedicated read rather than a `useInvoices` page the screen sums: the queue is
 * capped at 100 rows, so totals derived from it stopped being true at the 101st
 * invoice — with nothing on screen to say so.
 */
export function useFinanceDashboardSummary(query: FinanceDashboardQuery = {}) {
  const fingerprint = useFinanceScopeFingerprint()
  return useQuery({
    queryKey: financeKeys.dashboard(fingerprint, query),
    queryFn: ({ signal }) =>
      studentFinanceService.getDashboardSummary(query, signal),
    placeholderData: (previous) => previous,
  })
}

export function useInvoice(invoiceId: InvoiceId, enabled = true) {
  const fingerprint = useFinanceScopeFingerprint()
  return useQuery({
    queryKey: financeKeys.invoice(fingerprint, invoiceId),
    queryFn: ({ signal }) => studentFinanceService.getInvoice(invoiceId, signal),
    enabled,
  })
}

export function useFinanceLookups() {
  const fingerprint = useFinanceScopeFingerprint()
  return useQuery({
    queryKey: financeKeys.lookups(fingerprint),
    queryFn: ({ signal }) => studentFinanceService.lookups(signal),
    staleTime: 60_000,
  })
}

/**
 * Shared invalidation for every invoice-affecting command, including the
 * cross-module student financial-summary key so the student workspace and the
 * finance workspace can never show different numbers.
 */
function useInvoiceInvalidation() {
  const client = useQueryClient()
  const fingerprint = useFinanceScopeFingerprint()
  return async (studentId: string, invoiceId?: InvoiceId) => {
    await Promise.all(
      invalidationTargets({
        kind: "invoice",
        fingerprint,
        studentId,
        invoiceId,
      }).map((queryKey) => client.invalidateQueries({ queryKey }))
    )
  }
}

function reportError(error: FinanceError) {
  toast.error(
    error.code === "version-conflict" ? financeCopy.conflict : error.message
  )
}

export function useRaiseInvoices() {
  const invalidate = useInvoiceInvalidation()
  return useMutation({
    mutationFn: (command: RaiseInvoicesCommand) =>
      studentFinanceService.raiseInvoices(command),
    onSuccess: async (invoices) => {
      if (invoices[0]) await invalidate(invoices[0].studentId, invoices[0].id)
      // Deliberately no "created" toast: the operation is idempotent on
      // (enrollment, purpose), so a repeat returns the existing invoices and
      // announcing a creation would be false. The caller compares against what
      // already existed and reports what actually happened.
    },
    onError: reportError,
  })
}

export function useUpdateDraftInvoice() {
  const invalidate = useInvoiceInvalidation()
  return useMutation({
    mutationFn: (command: UpdateDraftInvoiceCommand) =>
      studentFinanceService.updateDraftInvoice(command),
    onSuccess: async (invoice) => {
      await invalidate(invoice.studentId, invoice.id)
      toast.success("تم حفظ الفاتورة")
    },
    onError: reportError,
  })
}

export function useIssueInvoice() {
  const invalidate = useInvoiceInvalidation()
  return useMutation({
    mutationFn: (command: IssueInvoiceCommand) =>
      studentFinanceService.issueInvoice(command),
    onSuccess: async (invoice) => {
      await invalidate(invoice.studentId, invoice.id)
      toast.success("تم إصدار الفاتورة وتثبيت قيمها")
    },
    onError: reportError,
  })
}

export function useCancelInvoice() {
  const invalidate = useInvoiceInvalidation()
  return useMutation({
    mutationFn: (command: CancelInvoiceCommand) =>
      studentFinanceService.cancelInvoice(command),
    onSuccess: async (invoice) => {
      await invalidate(invoice.studentId, invoice.id)
      toast.success("تم إلغاء الفاتورة مع الاحتفاظ بها للسجل")
    },
    onError: reportError,
  })
}

export function useExportInvoices() {
  return useMutation({
    mutationFn: (query: InvoiceListQuery) =>
      studentFinanceService.exportInvoices(query),
    onSuccess: (csv) => {
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" })
      )
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "invoices.csv"
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success("تم تجهيز ملف التصدير")
    },
    onError: reportError,
  })
}
