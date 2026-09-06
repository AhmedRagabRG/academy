"use client"
import type { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { useState } from "react"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { EntityManager } from "../components/entity-manager"
import { UserForm } from "../forms/user-form"
import { useEntityList, useEntityMutations } from "../hooks/use-access-management"
import type { InternalUser } from "../types/domain"
import { defaultListQuery } from "../utils/list-query-state"

export function UsersScreen() {
  const [query, setQuery] = useState(defaultListQuery)
  const [editing, setEditing] = useState<InternalUser | "new" | null>(null)
  const list = useEntityList("users", query)
  const roles = useEntityList("roles", { ...defaultListQuery, pageSize: 50 })
  const mutations = useEntityMutations("users")

  const columns: ColumnDef<InternalUser>[] = [
    {
      accessorKey: "fullName",
      header: "المستخدم",
      cell: ({ row }) => (
        <Link
          className="font-medium text-brand-blue hover:underline"
          href={`/settings/users/${row.original.id}`}
        >
          {row.original.fullName}
        </Link>
      ),
    },
    {
      accessorKey: "email",
      header: "البريد",
      cell: ({ row }) => <bdi>{row.original.email}</bdi>,
    },
    {
      accessorKey: "status",
      header: "الحالة",
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.status === "active" ? "نشط" : "غير نشط"}
          tone={row.original.status === "active" ? "success" : "warning"}
        />
      ),
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setEditing(row.original)}>
            تعديل
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              mutations.status.mutate({
                id: row.original.id,
                status: row.original.status === "active" ? "inactive" : "active",
                version: row.original.version,
              })
            }
          >
            {row.original.status === "active" ? "تعطيل" : "تفعيل"}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <EntityManager
      title="المستخدمون"
      description="حسابات الموظفين الداخلية والأدوار الموروثة."
      records={list.data}
      query={query}
      loading={list.isLoading || roles.isLoading}
      error={list.error ?? roles.error}
      columns={columns}
      editing={Boolean(editing)}
      onCreate={() => setEditing("new")}
      onClose={() => setEditing(null)}
      onSearch={(search) => setQuery((current) => ({ ...current, search, page: 1 }))}
      onPage={(page) => setQuery((current) => ({ ...current, page }))}
      refetch={() => void list.refetch()}
      editor={
        <UserForm
          record={editing === "new" ? undefined : editing ?? undefined}
          roles={roles.data?.items ?? []}
          pending={mutations.create.isPending || mutations.update.isPending}
          error={mutations.create.error ?? mutations.update.error}
          onSubmit={(values) =>
            editing === "new"
              ? mutations.create.mutate(values)
              : editing &&
                mutations.update.mutate({
                  id: editing.id,
                  input: { ...values, expectedVersion: editing.version },
                })
          }
        />
      }
    />
  )
}
