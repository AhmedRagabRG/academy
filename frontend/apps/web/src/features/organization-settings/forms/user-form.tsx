"use client"
import { MultiSelectField } from "@/shared/components/forms/multi-select-field"
import { SelectField } from "@/shared/components/forms/select-field"
import { TextField } from "@/shared/components/forms/text-field"
import { createUserSchema, userSchema, type CreateUserInput, type UserInput } from "../schemas/user-schema"
import type { InternalUser, Role } from "../types/domain"
import { SchemaForm } from "./schema-form"

export function UserForm({
  record,
  roles,
  pending,
  error,
  onSubmit,
}: {
  record?: InternalUser
  roles: Role[]
  pending: boolean
  error?: unknown
  onSubmit: (values: UserInput & { password?: string }) => void
}) {
  const values = (record
    ? {
        fullName: record.fullName,
        email: record.email,
        phone: record.phone,
        roleIds: record.roleIds,
        status: record.status === "archived" ? "inactive" : record.status,
      }
    : {
        fullName: "",
        email: "",
        phone: "",
        roleIds: [],
        status: "active",
        password: "",
      }) as CreateUserInput

  return (
    <SchemaForm
      schema={(record ? userSchema : createUserSchema) as never}
      values={values}
      pending={pending}
      error={error}
      onSubmit={(input: CreateUserInput) => onSubmit(input)}
    >
      <TextField name="fullName" label="الاسم الكامل" />
      <TextField name="email" label="البريد الإلكتروني" dir="ltr" />
      <TextField name="phone" label="رقم الهاتف" dir="ltr" />
      {!record && <TextField name="password" label="كلمة المرور المبدئية" type="password" dir="ltr" />}
      <SelectField
        name="status"
        label="الحالة"
        options={[
          { value: "active", label: "نشط" },
          { value: "inactive", label: "غير نشط" },
        ]}
      />
      <div className="md:col-span-2">
        <MultiSelectField
          name="roleIds"
          label="الأدوار"
          options={roles
            .filter((item) => item.status === "active")
            .map((item) => ({ value: item.id, label: item.name }))}
        />
      </div>
    </SchemaForm>
  )
}
