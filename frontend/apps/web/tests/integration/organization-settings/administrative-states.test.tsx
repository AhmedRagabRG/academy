import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AdministrativeQueryState } from "@/features/organization-settings/components/administrative-query-state"
describe("administrative query state", () => { it("renders recoverable errors", () => { render(<AdministrativeQueryState loading={false} error={new Error("تعذر التحميل")} onRetry={() => undefined}><p>content</p></AdministrativeQueryState>); expect(screen.getByRole("alert")).toHaveTextContent("تعذر التحميل") }) })
