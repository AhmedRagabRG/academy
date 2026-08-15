"use client"
import { useRef } from "react"
export function useInboxFocus() {
  const origin = useRef<HTMLElement | null>(null)
  return {
    remember: () => {
      origin.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
    },
    restore: () => origin.current?.focus(),
  }
}
