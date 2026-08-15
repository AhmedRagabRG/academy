"use client"
import { SelectField } from "@/shared/components/forms/select-field"
import { TextField } from "@/shared/components/forms/text-field"
import { TextareaField } from "@/shared/components/forms/textarea-field"
import { departmentSchema, type DepartmentInput } from "../schemas/department-schema"
import type { Department } from "../types/domain"
import { SchemaForm } from "./schema-form"
export function DepartmentForm({ record, pending, error, onSubmit }: { record?: Department; pending: boolean; error?: unknown; onSubmit: (values: DepartmentInput) => void }) { return <SchemaForm schema={departmentSchema} values={record ? { name: record.name, code: record.code, description: record.description, status: record.status } : { name: "", code: "", description: "", status: "active" }} pending={pending} error={error} onSubmit={onSubmit} submitLabel={record ? "حفظ القسم" : "إنشاء القسم"}><TextField name="name" label="اسم القسم" /><TextField name="code" label="رمز القسم" dir="ltr" /><SelectField name="status" label="الحالة" options={[{ value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }, { value: "archived", label: "مؤرشف" }]} /><div className="md:col-span-2"><TextareaField name="description" label="الوصف" /></div></SchemaForm> }
