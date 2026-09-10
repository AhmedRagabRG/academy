"use client"

import { weekdays } from "../config/ai-agent-permissions"

const RANGE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/
const DEFAULT_RANGE = "09:00-17:00"

export const isValidRange = (value: string): boolean => RANGE.test(value.trim())

/**
 * `null` means 24/7; a day absent from the map is closed. Kept as the same
 * `{ sat: "09:00-17:00" }` shape the backend stores, so nothing has to be
 * translated on the way in or out.
 */
export function WorkingHoursEditor({
  value,
  disabled,
  onChange,
}: {
  value: Record<string, string> | null
  disabled: boolean
  onChange: (next: Record<string, string> | null) => void
}) {
  const alwaysOn = value === null

  const setDay = (code: string, range: string | null) => {
    const next = { ...(value ?? {}) }
    if (range === null) delete next[code]
    else next[code] = range
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={alwaysOn}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.checked ? null : { sun: DEFAULT_RANGE })
          }
        />
        يعمل على مدار الساعة
      </label>

      {!alwaysOn && (
        <ul className="space-y-2">
          {weekdays.map((day) => {
            const range = value?.[day.code]
            const open = range !== undefined
            const invalid = open && !isValidRange(range)
            return (
              <li key={day.code} className="flex flex-wrap items-center gap-2">
                <label className="flex w-28 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={open}
                    disabled={disabled}
                    onChange={(event) =>
                      setDay(day.code, event.target.checked ? DEFAULT_RANGE : null)
                    }
                  />
                  {day.label}
                </label>
                {open ? (
                  <>
                    <input
                      value={range}
                      disabled={disabled}
                      onChange={(event) => setDay(day.code, event.target.value)}
                      aria-label={`ساعات ${day.label}`}
                      aria-invalid={invalid}
                      placeholder="09:00-17:00"
                      className={`border-border bg-background min-h-9 w-40 rounded-lg border px-3 py-2 text-sm ${
                        invalid ? "border-destructive" : ""
                      }`}
                      dir="ltr"
                    />
                    {invalid && (
                      <span className="text-destructive text-xs">
                        الصيغة المطلوبة 09:00-17:00
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm">مغلق</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
