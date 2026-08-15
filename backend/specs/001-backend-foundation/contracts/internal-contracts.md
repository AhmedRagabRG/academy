# Contract: Internal Interfaces

The TypeScript-level surface every future business module builds against. These are contracts in the
same sense the HTTP envelope is one: modules depend on them, so changing them is a breaking change.

Shapes are shown as signatures, not implementations. Implementation belongs in `tasks.md`.

---

## `StorageService` — the only path-aware code

```ts
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface StorageService {
  store(file: UploadedFile, purpose: UploadPurpose, idempotencyKey?: string): Promise<FileDescriptor>;
  retrieve(id: string): Promise<NodeJS.ReadableStream>;
  remove(id: string): Promise<void>;
}
```

**The contract**: business modules receive a `FileDescriptor` and persist it on their own record.
They never see a path, never build a filename, never touch `fs`. Injection is by the `STORAGE_SERVICE`
token, never by the concrete class — that indirection is what makes SC-009 (swap the backend, change
one file) true (FR-050, FR-051).

`purpose` drives the type and size limits (`catalog-asset`, `organization-logo`, `student-photo`,
`student-document`, `admission-document`, `expense-attachment`). Passing `idempotencyKey` makes a
retry resolve to the already-stored descriptor instead of creating a duplicate (FR-058).

---

## `BaseRepository` — the only Prisma consumer

```ts
export abstract class BaseRepository<TModel, TDelegate> {
  protected constructor(protected readonly prisma: PrismaService, protected readonly delegate: TDelegate) {}

  protected paginate<T>(args: PageQuery, query: PaginatedQuery<T>): Promise<PageResult<T>>;
  protected assertVersion(current: number, expected: number): void;  // throws VersionConflictException
  protected scopeToBranches(caller: CallerContext, where: object): object;
  protected withTransaction(tx?: Prisma.TransactionClient): TDelegate;
}
```

**The rule this encodes**: `import { PrismaService }` appears in `src/database/` and in classes
extending `BaseRepository`. Nowhere else. A Prisma import in a service or controller is a
constitution Principle V violation and should fail review (FR-002, FR-003).

`paginate` enforces the defaults centrally — page size 20, maximum 100, over-range returns an empty
page rather than an error — so no repository can get pagination subtly wrong (FR-022).

---

## `TransactionManager` — atomic multi-entity writes

```ts
export interface TransactionManager {
  run<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
```

Services compose repository calls inside `run`; repositories accept the ambient `tx` and use it in
place of their own client. Any failure rolls the whole unit back — partial writes are prohibited
(FR-012, constitution XI).

**Ownership**: transaction boundaries belong to the *service* layer. A repository must never open a
transaction on its own, because it cannot know what else belongs in the same unit of work.

---

## `DomainEventBus` — audit readiness

```ts
export interface DomainEvent {
  name: string;
  occurredAt: string;
  actor: { accountId: string } | null;
  target: { type: string; id: string };
  operation: string;
  payload: Record<string, unknown>;
}

export interface DomainEventBus {
  emit(event: DomainEvent): void;
}
```

Business operations emit; nothing subscribes yet. **That is the design, not an omission** — Principle
X requires that audit logging can be added later by registering a subscriber, without editing a single
business operation (FR-071).

---

## Authorization decorators

```ts
@RequirePermissions('students.view', 'students.update')  // AND semantics
@Public()                                                 // opt out of the global guard
@CurrentCaller() caller: CallerContext                    // param decorator
```

**Protected is the default.** `PermissionsGuard` is registered globally, so an endpoint with no
decorator requires authentication. `@Public()` is the deliberate, visible exception (FR-046) — which
means forgetting to protect an endpoint fails closed rather than open.

`@RequirePermissions` takes namespaced `module[.resource].action` keys and requires *all* of them.
The guard validates key *shape*, not membership in the catalogue — the catalogue arrives with the
Users/Roles module (assumption A-007).

---

## `BranchScopeService` — the out-of-scope distinction

```ts
export interface BranchScopeService {
  applyToQuery(caller: CallerContext, where: object): object;
  assertInScope(caller: CallerContext, recordBranchId: string): void;  // throws OutOfScopeException
}
```

Two methods because there are two situations, and conflating them is the mistake this prevents:

- **Lists** filter silently. An out-of-scope record is simply absent (FR-048).
- **Detail reads** refuse loudly, with `out-of-scope` — *not* `FORBIDDEN`. The UI shows a different
  message for "exists but not yours" than for "you lack permission", and collapsing the two breaks
  that distinction.

`organizationWide` callers bypass both.

---

## `RecordPermissionsHelper` — per-record permissions

```ts
export interface RecordPermissionsHelper {
  compute<T extends string>(caller: CallerContext, keys: readonly T[]): Record<T, boolean>;
}
```

Detail responses must carry a computed permissions object. An absent or empty one blanks the entire
action surface of a detail screen — a contract violation, not a cosmetic omission (FR-049).

---

## Auth primitives

```ts
export interface TokenService {
  issueAccessToken(account: AccountWithRole): Promise<string>;
  issueRefreshToken(accountId: string): Promise<{ token: string; id: string }>;
  verifyAccessToken(token: string): Promise<AccessTokenClaims>;
  verifyRefreshToken(token: string): Promise<RefreshTokenClaims>;  // checks the stored record
  revokeRefreshToken(id: string): Promise<void>;
}

export interface PasswordService {
  hash(plaintext: string): Promise<string>;
  verify(plaintext: string, hash: string): Promise<boolean>;
}

export interface CookieService {
  setCredentialCookies(res: Response, access: string, refresh: string): void;
  clearCredentialCookies(res: Response): void;
}
```

**`verifyRefreshToken` hits the database on purpose.** A cryptographically valid refresh token whose
stored record is revoked, expired, or missing must be refused (FR-038). Stateless verification alone
would make sign-out advisory rather than real.

**The auth guard loads the account on every authenticated request** so that an archived account's
still-valid token is refused (FR-037). One indexed lookup per request is the accepted cost of
revocation actually working (research D-05).

---

## Shared utilities

```ts
normalizeArabic(input: string): string;   // آأإٱ→ا, ى→ي, ة→ه, strip diacritics
normalizeDigits(input: string): string;   // Arabic-Indic → ASCII
toMinorUnits(money: Money): bigint;
fromMinorUnits(units: bigint, currency: string, precision: number): Money;
inclusiveEndOfDay(dateOnly: string): Date;
```

`normalizeArabic` must fold identically to the client's implementation, or server-side search returns
different results than users saw against the mock (FR-073).

`inclusiveEndOfDay` exists because a date-only upper bound that is treated as exclusive makes
last-day records silently vanish from queues — a bug that looks like missing data, not like a
date-handling error (FR-075).
