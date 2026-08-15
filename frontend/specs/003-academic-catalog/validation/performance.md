# Performance Validation

- Static routes prerender; parameterized detail/edit routes render on demand.
- Query keys and mutation invalidation are product/taxonomy scoped.
- Lists use server-shaped pagination, stable IDs, cancellable reads, previous results, and deterministic sorting.
- One versioned product query supplies the editor; local state stays form/transient UI state.
- Media uses metadata and object URLs rather than base64 fixture payloads.
- Responsive tests cover tablet, laptop, and desktop with table-local overflow.

Validated with production build, query tests, and Playwright.
