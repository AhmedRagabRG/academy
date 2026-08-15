"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { createQueryClient } from "./query-client"
import { ThemeProvider } from "./theme-provider"
import { Toaster } from "@/shared/components/feedback/toaster"
// Wires cross-module ports to their adapters exactly once, before any screen
// resolves a reader.
import "./module-registry"

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(createQueryClient)
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
      <Toaster />
    </ThemeProvider>
  )
}
