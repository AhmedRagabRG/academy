# Program Batches Internal Ports

The normative public-boundary contract is [program-batches-public-ports.contract.md](program-batches-public-ports.contract.md).

Implementation bindings:

- `CATALOG_PUBLIC_PORT` resolves Professional Program identity, status, batchability, labels, and pricing defaults.
- `ORGANIZATION_MASTER_DATA_PORT` resolves academic years, branches, and `program-intakes` without exposing Organization repositories.
- `ORGANIZATION_SETTINGS_PORT` exposes only currency and precision defaults.
- `BATCH_ENROLLMENT_DEPENDENCY_PORT` distinguishes available counts/dependency flags from unavailable Admissions state.
- `PROGRAM_BATCHES_PUBLIC_PORT` is the only supported in-process boundary for Admissions and later consumers.

No port returns Prisma records, scaled internal integers, or foreign repository instances.
