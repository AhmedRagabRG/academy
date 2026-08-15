# Accounting route segments

Every file here is a **Server Component**. A `page.tsx` imports exactly one screen
from `@/features/accounting` and renders it — it never reads fixtures, permissions,
or service internals, and it holds no business logic.

The client boundary begins at the screen, so each route segment code-splits on its
own.

Every segment carries its own `loading.tsx` and `error.tsx`. A segment without them
falls back to the nearest ancestor boundary, which reports the wrong thing.
