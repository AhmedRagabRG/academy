"use client"

import type { EmployeeContext } from "@/shared/types/foundation"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ContextState {
  context: EmployeeContext | null
  setContext: (context: EmployeeContext | null) => void
}

export const useEmployeeContextStore = create<ContextState>()(
  persist(
    (set) => ({ context: null, setContext: (context) => set({ context }) }),
    { name: "alsalam.mock-context", version: 1 },
  ),
)
