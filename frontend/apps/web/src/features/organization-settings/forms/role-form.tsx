"use client"
import { SelectField } from "@/shared/components/forms/select-field"
import { TextField } from "@/shared/components/forms/text-field"
import { TextareaField } from "@/shared/components/forms/textarea-field"
import { roleSchema, type RoleInput } from "../schemas/role-permission-schema"
import type { Role } from "../types/domain"
import { SchemaForm } from "./schema-form"
export function RoleForm({ record, pending, error, onSubmit }: { record?: Role; pending: boolean; error?: unknown; onSubmit: (values: RoleInput) => void }) { return <SchemaForm schema={roleSchema} values={record ? { name: record.name, code: record.code, description: record.description, permissionIds: record.permissionIds, status: record.status } : { name: "", code: "", description: "", permissionIds: [], status: "active" }} pending={pending} error={error} onSubmit={onSubmit}><TextField name="name" label="اسم الدور" /><TextField name="code" label="رمز الدور" dir="ltr" /><SelectField name="status" label="الحالة" options={[{ value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }, { value: "archived", label: "مؤرشف" }]} /><div className="md:col-span-2"><TextareaField name="description" label="الوصف" /></div></SchemaForm> }
