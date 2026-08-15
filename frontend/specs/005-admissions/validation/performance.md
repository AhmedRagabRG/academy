# Performance Review

- App Router pages remain Server Components; interactive orchestration starts at screen boundaries.
- Dynamic route params are awaited promises as required by Next.js 16.
- Columns and query keys are stable; query functions consume AbortSignal; list DTOs exclude documents, notes, and full phone/ID values.
- Production build and the deterministic 10,000-summary generation check pass.
