import type { EntityStatus, ListQuery, LookupOption, PaginatedResult } from "../types/common"
import type {
  GeneralSettings,
  OrganizationProfile,
  PermissionGroup,
  Role,
} from "../types/domain"
import { OrganizationSettingsError } from "./organization-settings-error"
import type {
  EntityByKind,
  EntityKind,
  OrganizationLookups,
  OrganizationSettingsService,
} from "./organization-settings-service"
import {
  toGeneralSettings,
  toInternalUser,
  toOrganizationProfile,
  toPaginated,
  toPermissionGroup,
  toRole,
  type ApiEmployee,
  type ApiGeneralSettings,
  type ApiOrganizationProfile,
  type ApiPermissionGroup,
  type ApiRole,
} from "./organization-settings-mapper"
import { ApiError, httpClient, type QueryValue } from "@/shared/api"

const PATHS: Record<EntityKind, string> = {
  users: "/settings/users",
  roles: "/settings/roles",
}

/**
 * Field names as the forms know them, keyed by the name the API reports.
 */
const FIELD_ALIASES: Partial<Record<EntityKind, Record<string, string>>> = {
  users: { displayName: "fullName" },
  roles: { displayName: "name" },
}

/**
 * Duplicate codes the identity module raises instead of `DUPLICATE_VALUE`,
 * mapped to the field each one is about.
 */
const DUPLICATE_FIELDS: Record<string, string> = {
  EMAIL_EXISTS: "email",
  ROLE_CODE_EXISTS: "code",
}

function toSettingsError(
  error: unknown,
  aliases?: Record<string, string>
): OrganizationSettingsError {
  if (!(error instanceof ApiError))
    return new OrganizationSettingsError(
      "unexpected",
      "unexpected",
      "تعذر إكمال الطلب. حاول مرة أخرى.",
      undefined,
      true
    )

  const { code, status, message } = error
  const raw = error.fieldErrors
  const fieldErrors =
    raw && aliases
      ? Object.fromEntries(
          Object.entries(raw).map(([field, text]) => [aliases[field] ?? field, text])
        )
      : raw

  if (code === "VERSION_CONFLICT")
    return new OrganizationSettingsError(
      "version-conflict",
      "version-conflict",
      message,
      fieldErrors
    )
  if (code === "DUPLICATE_VALUE" || code in DUPLICATE_FIELDS) {
    const field = DUPLICATE_FIELDS[code]
    return new OrganizationSettingsError(
      "duplicate",
      "duplicate",
      message,
      fieldErrors ?? (field ? { [field]: message } : undefined)
    )
  }
  if (code === "VALIDATION_ERROR" || status === 422)
    return new OrganizationSettingsError("validation", "validation", message, fieldErrors)
  if (status === 404)
    return new OrganizationSettingsError("not-found", "not-found", message)
  if (status === 401 || status === 403)
    return new OrganizationSettingsError("permission", "permission", message)
  if (code === "ENTITY_IN_USE" || code === "DEPENDENCY_IN_USE" || code === "DEPENDENCY_NOT_FOUND")
    return new OrganizationSettingsError("dependency", "dependency", message, fieldErrors)
  if (code === "INVALID_STATE" || code === "INVALID_TRANSITION" || code === "DATE_OVERLAP")
    return new OrganizationSettingsError("state", "state", message, fieldErrors)
  if (status === 409)
    return new OrganizationSettingsError("state", "state", message, fieldErrors)
  return new OrganizationSettingsError(
    code,
    "unexpected",
    message,
    fieldErrors,
    status === 0 || status >= 500
  )
}

async function guard<T>(
  operation: () => Promise<T>,
  kind?: EntityKind
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw toSettingsError(error, kind ? FIELD_ALIASES[kind] : undefined)
  }
}

/** Translates the shared list query into the API's parameter names. */
function listParams(kind: EntityKind, query: ListQuery): Record<string, QueryValue> {
  const params: Record<string, QueryValue> = {
    page: query.page,
    pageSize: query.pageSize,
  }
  if (query.search) params.search = query.search
  if (query.sort) params.sort = query.sort
  if (query.direction) params.sortOrder = query.direction

  if (kind === "users") {
    if (query.status && query.status !== "all") params.status = query.status
    delete params.sort
    if (query.sort === "fullName") params.sort = "displayName"
    if (query.sort === "email" || query.sort === "createdAt" || query.sort === "updatedAt")
      params.sort = query.sort
    return params
  }

  if (query.status) params.status = query.status === "all" ? "ALL" : query.status
  return params
}

const listEmployees = (params: Record<string, QueryValue>) =>
  httpClient.getPage<ApiEmployee>(PATHS.users, params)

type AnyRecord = Record<string, unknown>

/** Builds the create payload each entity's route expects. */
function createBody(kind: EntityKind, input: AnyRecord): AnyRecord {
  switch (kind) {
    case "users":
      return {
        email: input.email,
        displayName: input.fullName,
        phone: input.phone,
        roleIds: input.roleIds ?? [],
        password: input.password,
        status: input.status ?? "active",
      }
    case "roles":
      return {
        code: input.code,
        displayName: input.name,
        description: input.description,
        permissionIds: input.permissionIds ?? [],
        status: input.status ?? "active",
      }
    default:
      return input
  }
}

/** Builds the update payload, which is always version-checked. */
function updateBody(
  kind: EntityKind,
  input: AnyRecord,
  expectedVersion: number
): AnyRecord {
  switch (kind) {
    case "users":
      return {
        expectedVersion,
        ...(input.email ? { email: input.email } : {}),
        ...(input.fullName ? { displayName: input.fullName } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.roleIds ? { roleIds: input.roleIds } : {}),
      }
    case "roles":
      return {
        expectedVersion,
        ...(input.name ? { displayName: input.name } : {}),
        ...(input.description ? { description: input.description } : {}),
      }
  }
}

export const httpOrganizationSettingsService: OrganizationSettingsService = {
  async getProfile(): Promise<OrganizationProfile> {
    return guard(async () => {
      const [profile, settings] = await Promise.all([
        httpClient.get<ApiOrganizationProfile>("/organization/profile"),
        httpClient
          .get<ApiGeneralSettings>("/settings/general")
          .then(toGeneralSettings)
          .catch(() => undefined),
      ])
      return toOrganizationProfile(profile, settings)
    })
  },

  async getGeneralSettings(): Promise<GeneralSettings> {
    return guard(async () =>
      toGeneralSettings(await httpClient.get<ApiGeneralSettings>("/settings/general"))
    )
  },

  async updateGeneralSettings(input): Promise<GeneralSettings> {
    return guard(async () =>
      toGeneralSettings(
        await httpClient.patch<ApiGeneralSettings>("/settings/general", {
          expectedVersion: input.expectedVersion,
          defaultLanguage: input.defaultLanguage,
          timeZone: input.timeZone,
          currency: input.currency,
          dateFormat: input.dateFormat,
          numberFormat: input.numberFormat,
          workingDays: input.workingDays,
        })
      )
    )
  },

  async getLookups(): Promise<OrganizationLookups> {
    return guard(async () => {
      const standards = await httpClient.get<{
        languages: Array<{ code: string; label: string }>
        timeZones: Array<{ code: string; label: string }>
        currencies: Array<{ code: string; label: string }>
        countries: Array<{ code: string; label: string }>
        dateFormats: Array<{ code: string; label: string }>
        numberFormats: Array<{ code: string; label: string }>
        weekdays: string[]
      }>("/settings/lookups")

      const WEEKDAY_LABELS: Record<string, string> = {
        sun: "الأحد",
        mon: "الإثنين",
        tue: "الثلاثاء",
        wed: "الأربعاء",
        thu: "الخميس",
        fri: "الجمعة",
        sat: "السبت",
      }
      const options = (
        entries: Array<{ code: string; label: string }> | undefined
      ): LookupOption[] =>
        (entries ?? []).map((entry) => ({ value: entry.code, label: entry.label }))

      return {
        languages: options(standards.languages),
        timeZones: options(standards.timeZones),
        currencies: options(standards.currencies),
        countries: options(standards.countries),
        dateFormats: options(standards.dateFormats),
        numberFormats: options(standards.numberFormats),
        weekdays: (standards.weekdays ?? []).map((day) => ({
          value: day,
          label: WEEKDAY_LABELS[day] ?? day,
        })),
      }
    })
  },

  async list<K extends EntityKind>(
    kind: K,
    query: ListQuery
  ): Promise<PaginatedResult<EntityByKind[K]>> {
    return guard(async () => {
      const params = listParams(kind, query)
      switch (kind) {
        case "roles":
          return toPaginated(
            await httpClient.getPage<ApiRole>(PATHS.roles, params),
            toRole
          ) as PaginatedResult<EntityByKind[K]>
        default: {
          const page = await listEmployees(params)
          return toPaginated(page, toInternalUser) as PaginatedResult<EntityByKind[K]>
        }
      }
    }, kind)
  },

  async get<K extends EntityKind>(kind: K, id: string): Promise<EntityByKind[K]> {
    return guard(async () => {
      const path = `${PATHS[kind]}/${id}`
      switch (kind) {
        case "roles":
          return toRole(await httpClient.get<ApiRole>(path)) as EntityByKind[K]
        default: {
          const employee = await httpClient.get<ApiEmployee>(path)
          return toInternalUser(employee) as EntityByKind[K]
        }
      }
    }, kind)
  },

  async create<K extends EntityKind>(
    kind: K,
    input: Omit<
      EntityByKind[K],
      "id" | "organizationId" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
    >
  ): Promise<EntityByKind[K]> {
    return guard(async () => {
      const source = input as AnyRecord
      const body = createBody(kind, source)
      switch (kind) {
        case "roles":
          return toRole(
            await httpClient.post<ApiRole>(PATHS.roles, body)
          ) as EntityByKind[K]
        default: {
          const employee = await httpClient.post<ApiEmployee>(PATHS.users, body)
          return toInternalUser(employee) as EntityByKind[K]
        }
      }
    }, kind)
  },

  async update<K extends EntityKind>(
    kind: K,
    id: string,
    input: Partial<EntityByKind[K]> & { expectedVersion: number }
  ): Promise<EntityByKind[K]> {
    return guard(async () => {
      const source = input as AnyRecord
      const path = `${PATHS[kind]}/${id}`
      const body = updateBody(kind, source, input.expectedVersion)
      switch (kind) {
        case "roles":
          return toRole(await httpClient.patch<ApiRole>(path, body)) as EntityByKind[K]
        default: {
          const employee = await httpClient.patch<ApiEmployee>(path, body)
          return toInternalUser(employee) as EntityByKind[K]
        }
      }
    }, kind)
  },

  async changeStatus<K extends EntityKind>(
    kind: K,
    id: string,
    status: EntityStatus,
    expectedVersion: number
  ): Promise<EntityByKind[K]> {
    return guard(async () => {
      const path = `${PATHS[kind]}/${id}/status`
      const body = { status, expectedVersion }
      switch (kind) {
        case "roles":
          return toRole(await httpClient.patch<ApiRole>(path, body)) as EntityByKind[K]
        default:
          return toInternalUser(
            await httpClient.patch<ApiEmployee>(path, body)
          ) as EntityByKind[K]
      }
    }, kind)
  },

  async getPermissionCatalog(): Promise<PermissionGroup[]> {
    return guard(async () => {
      const groups = await httpClient.get<ApiPermissionGroup[]>(
        "/settings/permissions/catalog"
      )
      return (groups ?? []).map(toPermissionGroup)
    })
  },

  async replaceRolePermissions(
    roleId: string,
    permissionIds: string[],
    expectedVersion: number
  ): Promise<Role> {
    return guard(async () =>
      toRole(
        await httpClient.put<ApiRole>(`${PATHS.roles}/${roleId}/permissions`, {
          permissionIds,
          expectedVersion,
        })
      )
    )
  },

  async getEffectivePermissions(userId: string): Promise<string[]> {
    return guard(async () => {
      const result = await httpClient.get<
        string[] | { permissionKeys?: string[]; permissions?: string[] }
      >(`${PATHS.users}/${userId}/effective-permissions`)
      if (Array.isArray(result)) return result
      return result?.permissionKeys ?? result?.permissions ?? []
    })
  },
}
