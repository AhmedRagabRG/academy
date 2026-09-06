"use client"
import { Plus, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/shared/components/data-table/data-table"
import { Card } from "@/shared/components/layout/card"
import type { BaseEntity, EntityStatus, ListQuery, PaginatedResult } from "../types/common"
import { getErrorMessage } from "../utils/service-error-mapping"
import { SettingsPage } from "./settings-page"
import { PermissionAwareAction } from "./permission-aware-action"

export function EntityManager<T extends BaseEntity & { status: EntityStatus }>({ title, description, records, query, loading, error, columns, editor, editing, permissionPrefix = "settings", onCreate, onClose, onSearch, onPage, onBulkAction, refetch }: { title: string; description: string; records?: PaginatedResult<T>; query: ListQuery; loading: boolean; error?: Error | null; columns: ColumnDef<T>[]; editor: React.ReactNode; editing: boolean; permissionPrefix?: string; onCreate: () => void; onClose: () => void; onSearch: (value: string) => void; onPage: (page: number) => void; onBulkAction?: (records: T[]) => void; refetch: () => void }) { return <SettingsPage title={title} description={description} actions={<PermissionAwareAction permissionKey={`${permissionPrefix}.create`}><Button onClick={onCreate}><Plus />إضافة جديد</Button></PermissionAwareAction>}><div className={editing ? "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]" : "grid gap-6"}><Card><DataTable data={records?.items ?? []} columns={columns} loading={loading} error={error ? getErrorMessage(error) : undefined} onRetry={refetch} getRowId={(record) => record.id} onBulkAction={onBulkAction} controlled={{ search: query.search ?? "", page: records?.page ?? query.page, pageSize: query.pageSize, total: records?.total ?? 0, totalPages: records?.totalPages ?? 1, onSearchChange: onSearch, onPageChange: onPage }} /></Card>{editing && <aside className="xl:sticky xl:top-24"><Card><div className="mb-5 flex items-center justify-between"><h2 className="font-heading text-lg font-medium text-brand-navy dark:text-foreground">بيانات السجل</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق النموذج"><X /></Button></div>{editor}</Card></aside>}</div></SettingsPage> }
