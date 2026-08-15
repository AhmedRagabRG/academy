"use client"
import { SelectField } from "@/shared/components/forms/select-field"
import { TextField } from "@/shared/components/forms/text-field"
import { academicYearSchema, type AcademicYearInput } from "../schemas/academic-calendar-schema"
import type { AcademicYear } from "../types/domain"
import { SchemaForm } from "./schema-form"
export function AcademicYearForm({ record, pending, error, onSubmit }: { record?: AcademicYear; pending: boolean; error?: unknown; onSubmit: (values: AcademicYearInput) => void }) { return <SchemaForm schema={academicYearSchema} values={record ? { name: record.name, code: record.code, startDate: record.startDate, endDate: record.endDate, status: record.status } : { name: "", code: "", startDate: "", endDate: "", status: "inactive" }} pending={pending} error={error} onSubmit={onSubmit}><TextField name="name" label="اسم العام" /><TextField name="code" label="رمز العام" dir="ltr" /><SelectField name="status" label="الحالة" options={[{ value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }]} /><TextField name="startDate" label="تاريخ البداية" type="date" dir="ltr" /><TextField name="endDate" label="تاريخ النهاية" type="date" dir="ltr" /></SchemaForm> }
