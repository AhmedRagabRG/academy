"use client"

import type { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Pencil } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { AdmissionSummary } from "../types/domain"
import { AdmissionStatusBadge } from "./admission-status-badge"
import { AdmissionsPermission } from "./admissions-page"

export const admissionColumns: ColumnDef<AdmissionSummary>[] = [
  {
    accessorKey: "applicantName",
    header: "المتقدم",
    cell: ({ row }) => (
      <div className="flex min-w-52 flex-col items-start gap-1 text-start">
        <Link
          className="font-heading font-bold text-brand-navy underline-offset-4 hover:text-brand-blue hover:underline dark:text-foreground"
          href={`/admissions/${row.original.id}`}
        >
          {row.original.applicantName}
        </Link>
        <span className="text-xs text-muted-foreground">
          <bdi dir="ltr">{row.original.reference}</bdi> ·{" "}
          <bdi dir="ltr">{row.original.phoneHint}</bdi>
        </span>
      </div>
    ),
  },
  {
    accessorKey: "offeringLabel",
    header: "المنتج الأكاديمي",
    cell: ({ row }) => (
      <div className="min-w-44">
        <p>{row.original.offeringLabel}</p>
        <p className="text-xs text-muted-foreground">
          <bdi dir="ltr">{row.original.offeringCode}</bdi>
          {row.original.batchCode && (
            <>
              {" "}
              · <bdi dir="ltr">{row.original.batchCode}</bdi>
            </>
          )}
        </p>
      </div>
    ),
  },
  { accessorKey: "registrationBranch", header: "الفرع" },
  { accessorKey: "assignedEmployee", header: "المسؤول" },
  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => <AdmissionStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "updatedAt",
    header: "آخر تحديث",
    cell: ({ row }) => (
      <bdi
        dir="ltr"
        className="text-xs whitespace-nowrap text-muted-foreground"
      >
        {new Date(row.original.updatedAt).toLocaleDateString("ar-EG")}
      </bdi>
    ),
  },
  {
    id: "actions",
    header: "الإجراءات",
    enableSorting: false,
    cell: ({ row }) => (
      <AdmissionsPermission permission="admissions.update">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/admissions/${row.original.id}/edit`} />}
        >
          <Pencil aria-hidden />
          تعديل
        </Button>
      </AdmissionsPermission>
    ),
  },
]
