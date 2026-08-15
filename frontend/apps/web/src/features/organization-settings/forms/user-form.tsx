"use client"
import { MultiSelectField } from "@/shared/components/forms/multi-select-field"
import { SelectField } from "@/shared/components/forms/select-field"
import { TextField } from "@/shared/components/forms/text-field"
import { createUserSchema, userSchema, type CreateUserInput, type UserInput } from "../schemas/user-schema"
import type { Branch, Department, InternalUser, Role } from "../types/domain"
import { SchemaForm } from "./schema-form"

/**
 * The employee form, which collects an initial password only when creating.
 *
 * The API sets the credential at creation and neither returns nor re-accepts it
 * on the update route, so a password field while editing would offer a change
 * that route cannot make. The schema differs by mode rather than the field
 * being merely hidden, so validation and payload agree with the route in use.
 */
export function UserForm({ record, branches, departments, roles, pending, error, onSubmit }: { record?: InternalUser; branches: Branch[]; departments: Department[]; roles: Role[]; pending: boolean; error?: unknown; onSubmit: (values: UserInput & { password?: string }) => void }) {
  const branch = branches.find((item) => item.id === record?.branchId) ?? branches[0]
  const department = departments.find((item) => item.id === record?.departmentId) ?? departments[0]
  const values = (record
    ? { fullName: record.fullName, email: record.email, phone: record.phone, branchId: record.branchId, branchName: record.branchName, departmentId: record.departmentId, departmentName: record.departmentName, roleIds: record.roleIds, status: record.status === "archived" ? "inactive" : record.status }
    : { fullName: "", email: "", phone: "", branchId: branch?.id ?? "", branchName: branch?.name ?? "", departmentId: department?.id ?? "", departmentName: department?.name ?? "", roleIds: [], status: "active", password: "" }) as CreateUserInput

  return (
    <SchemaForm
      schema={(record ? userSchema : createUserSchema) as never}
      values={values}
      pending={pending}
      error={error}
      onSubmit={(input: CreateUserInput) =>
        onSubmit({
          ...input,
          branchName: branches.find((item) => item.id === input.branchId)?.name ?? input.branchName,
          departmentName: departments.find((item) => item.id === input.departmentId)?.name ?? input.departmentName,
        })
      }
    >
      <TextField name="fullName" label="الاسم الكامل" />
      <TextField name="email" label="البريد الإلكتروني" dir="ltr" />
      <TextField name="phone" label="رقم الهاتف" dir="ltr" />
      {!record && <TextField name="password" label="كلمة المرور المبدئية" type="password" dir="ltr" />}
      <SelectField name="status" label="الحالة" options={[{ value: "active", label: "نشط" }, { value: "inactive", label: "غير نشط" }]} />
      <SelectField name="branchId" label="الفرع" options={branches.filter((item) => item.status === "active").map((item) => ({ value: item.id, label: item.name }))} />
      <SelectField name="departmentId" label="القسم" options={departments.filter((item) => item.status === "active").map((item) => ({ value: item.id, label: item.name }))} />
      <div className="md:col-span-2">
        <MultiSelectField name="roleIds" label="الأدوار" options={roles.filter((item) => item.status === "active").map((item) => ({ value: item.id, label: item.name }))} />
      </div>
    </SchemaForm>
  )
}
