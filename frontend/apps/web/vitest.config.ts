import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@workspace/ui": path.resolve(import.meta.dirname, "../../packages/ui/src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    /**
     * Unit and integration tests run against the in-memory fixtures.
     *
     * They assert domain rules — version conflicts, permission refusals,
     * scope narrowing — by driving the mock scenario controllers into states
     * a live database cannot be asked to produce on demand, and they must not
     * depend on a backend being up. The HTTP services are covered separately
     * against the running API.
     */
    env: { NEXT_PUBLIC_API_MOCKS: "true" },
  },
})
