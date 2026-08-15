"use client"
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { OrderedText } from "../types/common"
export function OrderedContentList({
  items,
  onChange,
}: {
  items: OrderedText[]
  onChange: (items: OrderedText[]) => void
}) {
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    onChange(next.map((item, position) => ({ ...item, position })))
  }
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex items-center gap-2 rounded-lg border p-2"
        >
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="تحريك لأعلى"
            onClick={() => move(index, -1)}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="تحريك لأسفل"
            onClick={() => move(index, 1)}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="destructive"
            aria-label="إزالة"
            onClick={() =>
              onChange(items.filter((current) => current.id !== item.id))
            }
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  )
}
