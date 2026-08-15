# Architecture Validation

- `program-batches` is an independent sibling feature and consumes public lookup concepts.
- Pages import only the feature boundary; screens use hooks; services alone import fixtures.
- Business behavior lives in schemas and pure utilities rather than components.
- No `any`, native alert, inline style, raw select outside the shared Dropdown, permanent delete, or generic partial-write contract is introduced.
