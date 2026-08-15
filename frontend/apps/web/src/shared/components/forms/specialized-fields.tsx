"use client"

import { useFormContext } from "react-hook-form"
import { TextField } from "./text-field"

export const DateField = ({ name, label }: { name: string; label: string }) => <TextField name={name} label={label} type="date" dir="ltr" />
export const PhoneField = ({ name, label }: { name: string; label: string }) => <TextField name={name} label={label} type="tel" dir="ltr" />
export const CurrencyField = ({ name, label }: { name: string; label: string }) => <TextField name={name} label={label} type="number" dir="ltr" />

export function ComboboxField({ name, label, options }: { name: string; label: string; options: readonly string[] }) {
  const { register } = useFormContext()
  return <div className="space-y-2"><label htmlFor={name}>{label}</label><input id={name} list={`${name}-options`} {...register(name)} className="border-input bg-background h-10 w-full rounded-lg border px-3" /><datalist id={`${name}-options`}>{options.map((option) => <option key={option} value={option} />)}</datalist></div>
}
