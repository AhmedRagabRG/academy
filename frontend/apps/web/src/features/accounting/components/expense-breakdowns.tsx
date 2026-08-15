"use client"

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card } from "@/shared/components/layout/card"
import { EmptyState } from "@/shared/components/states/empty-state"
import { formatMoney } from "@/shared/utils/money"
import type { ExpenseBreakdownRow } from "../types/projections"
import { AccountingBidiValue } from "./accounting-area-states"

const palette = [
  "var(--color-chart-1, #2563eb)",
  "var(--color-chart-2, #16a34a)",
  "var(--color-chart-3, #d97706)",
  "var(--color-chart-4, #7c3aed)",
  "var(--color-chart-5, #dc2626)",
]

/**
 * A breakdown, as a chart **and** as a table.
 *
 * The chart is the quick read; the table is the accessible one. Every figure is
 * readable as text, so nothing here depends on seeing colour or on a tooltip
 * appearing — a chart alone would make these numbers unavailable to a screen
 * reader.
 */
export function ExpenseBreakdown({
  title,
  rows,
  emptyTitle,
}: {
  title: string
  rows: readonly ExpenseBreakdownRow[]
  emptyTitle: string
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} />

  // Recharts plots JS numbers. This is presentation only — the authoritative
  // figure is the decimal string rendered in the table below, never this.
  const data = rows.map((row) => ({
    label: row.label,
    value: Number(row.total.amount),
  }))

  return (
    <Card className="space-y-4">
      <h3 className="font-medium">{title}</h3>

      {/*
        `dir="ltr"` on the plot only. Recharts anchors its tick text assuming a
        left-to-right flow; under the page's RTL direction those anchors invert
        and every category label was drawn across the bar it names. The chart
        is still read right-to-left — that comes from the mirrored axes below,
        not from the text direction. The Arabic labels themselves are unchanged:
        the script sets its own direction within the run.
      */}
      <div className="h-56 w-full" dir="ltr" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          {/*
            Mirrored for Arabic: the category sits on the right and the bar
            grows leftwards from it. Left-anchored labels with right-growing
            bars put the two in the same space and the text was drawn over the
            bar it labelled.
          */}
          <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
            <XAxis type="number" reversed hide />
            <YAxis
              type="category"
              dataKey="label"
              orientation="right"
              width={110}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={(value) => Number(value ?? 0).toLocaleString("ar-EG")} />
            {/*
              Capped: with two or three categories the band is the whole plot,
              and an uncapped bar becomes a block of colour rather than a bar.
              The entry animation is off because it begins from a zero-width
              container and left the rectangles unpainted.
            */}
            <Bar dataKey="value" radius={4} barSize={28} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={palette[index % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="w-full text-sm">
        <caption className="sr-only">{title}</caption>
        <thead className="text-muted-foreground">
          <tr>
            <th scope="col" className="p-2 text-start font-medium">
              البند
            </th>
            <th scope="col" className="p-2 text-start font-medium">
              عدد الطلبات
            </th>
            <th scope="col" className="p-2 text-start font-medium">
              الإجمالي
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t">
              <td className="p-2">{row.label}</td>
              <td className="p-2">
                <AccountingBidiValue>{row.count}</AccountingBidiValue>
              </td>
              <td className="p-2 font-medium">
                <AccountingBidiValue>{formatMoney(row.total)}</AccountingBidiValue>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
