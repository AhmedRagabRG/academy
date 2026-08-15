"use client"
import { useProductMutations } from "./use-academic-catalog"
export function useProductLifecycle() { return useProductMutations().transition }
