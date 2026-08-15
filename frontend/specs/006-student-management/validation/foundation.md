# Validation: Foundation (Phases 1–2)

**Feature**: Student Management | **Status**: in progress

## Module boundary

- [x] Feature directories created under `apps/web/src/features/students/`
- [x] Public barrel established at `apps/web/src/features/students/index.ts`
- [x] Route segment documented in `apps/web/src/app/(workspace)/students/README.md`
- [x] Navigation entry registered through `shared/config/foundation-navigation.ts`
- [x] `students` icon registered in `shared/config/icon-registry.ts`
- [x] Fifteen permission keys defined in `config/students-permissions.ts` and seeded in `features/auth/data/auth-fixtures.ts`

## Evidence

| Item | Where |
| --- | --- |
| Arabic copy centralized | `features/students/config/students-copy.ts` |
| Permission keys | `features/students/config/students-permissions.ts` |
| Navigation contribution | `features/students/config/navigation.ts` |
| No create route | `app/(workspace)/students/` contains no `create` segment |

## Notes

Recorded during `/speckit.implement`. Story-level evidence files are added as each
phase reaches its checkpoint.
