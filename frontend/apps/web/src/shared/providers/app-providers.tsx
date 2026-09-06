"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { createQueryClient } from "./query-client"
import { ThemeProvider } from "./theme-provider"
import { Toaster } from "@/shared/components/feedback/toaster"


export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(createQueryClient)
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
      <Toaster />
    </ThemeProvider>
  )
}
