"use client"
import { useFormContext } from "react-hook-form"
export function SwitchField({ name, label }: { name: string; label: string }) { const { register } = useFormContext(); return <label className="flex items-center gap-2"><input type="checkbox" {...register(name)} className="size-4" /><span>{label}</span></label> }
