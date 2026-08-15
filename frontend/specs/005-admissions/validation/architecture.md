# Architecture Review

- Routes and screens consume the Admissions service/hooks; mock fixtures remain behind the service boundary.
- The feature uses strict TypeScript, RHF + Zod, TanStack Query, shared Dropdown/DataTable/dialog/upload/badge/state primitives, Sonner, Lucide, and Tailwind classes.
- There are no raw selects, inline styles, native alerts, generic partial-write commands, permanent delete operations, or `any` types in Admissions.
- Cross-feature data is consumed only through public projections and Admissions-owned reader ports.
