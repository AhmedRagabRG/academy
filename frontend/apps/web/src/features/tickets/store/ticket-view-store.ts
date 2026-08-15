"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { TicketFilters, TicketSort } from "../types/commands"

export interface SavedTicketView { id: string; name: string; search: string; filters: TicketFilters; sort: TicketSort }
interface Store { views: SavedTicketView[]; addView: (view: SavedTicketView) => void; removeView: (id: string) => void }
export const useTicketViewStore = create<Store>()(persist((set) => ({ views: [], addView: (view) => set((s) => ({ views: [...s.views.filter((v) => v.id !== view.id), view] })), removeView: (id) => set((s) => ({ views: s.views.filter((v) => v.id !== id) })) }), { name: "alsalam.ticket-views", version: 1 }))
