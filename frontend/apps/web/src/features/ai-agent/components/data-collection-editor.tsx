"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { DataCollectionField } from "../types/domain"

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/

/**
 * Which details the agent should gather conversationally. Order matters: the
 * agent works down the list, so the most important field goes first.
 */
export function DataCollectionEditor({
  fields,
  disabled,
  onChange,
}: {
  fields: DataCollectionField[]
  disabled: boolean
  onChange: (next: DataCollectionField[]) => void
}) {
  const [key, setKey] = useState("")
  const [label, setLabel] = useState("")

  const keyTaken = fields.some((field) => field.key === key.trim())
  const keyValid = KEY_PATTERN.test(key.trim())
  const canAdd = keyValid && !keyTaken && label.trim().length > 0

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    const moved = next[index]
    if (!moved) return
    next.splice(index, 1)
    next.splice(target, 0, moved)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          لا توجد حقول. لن يحاول المساعد جمع أي بيانات من العميل.
        </p>
      ) : (
        <ul className="space-y-2">
          {fields.map((field, index) => (
            <li
              key={field.key}
              className="border-border flex flex-wrap items-center gap-2 rounded-lg border p-2"
            >
              <span className="min-w-0 flex-1 text-sm">
                {field.label}{" "}
                <code className="text-muted-foreground text-xs" dir="ltr">
                  {field.key}
                </code>
              </span>
              {!disabled && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`تحريك ${field.label} لأعلى`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`تحريك ${field.label} لأسفل`}
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onChange(fields.filter((item) => item.key !== field.key))
                    }
                  >
                    حذف
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block">المفتاح</span>
            <input
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="preferred_branch"
              dir="ltr"
              className="border-border bg-background min-h-9 w-48 rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">ما يُعرض للعميل</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="الفرع المفضل"
              className="border-border bg-background min-h-9 w-56 rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <Button
            type="button"
            disabled={!canAdd}
            onClick={() => {
              onChange([...fields, { key: key.trim(), label: label.trim() }])
              setKey("")
              setLabel("")
            }}
          >
            إضافة حقل
          </Button>
          {key.trim() && !keyValid && (
            <p className="text-destructive w-full text-xs">
              المفتاح بحروف إنجليزية صغيرة وشرطة سفلية فقط، مثل preferred_branch
            </p>
          )}
          {keyTaken && (
            <p className="text-destructive w-full text-xs">هذا المفتاح مستخدم بالفعل</p>
          )}
        </div>
      )}
    </div>
  )
}
