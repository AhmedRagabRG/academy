import { API_BASE_URL, CSRF_HEADER, SAFE_METHODS } from "./api-config"
import { ApiError, NetworkError, type ApiErrorDetail } from "./api-error"
import { captureCsrfToken, ensureCsrfToken, refreshCsrfToken } from "./csrf"

/** The envelope every successful response is wrapped in. */
interface Envelope<T> {
  success: true
  data: T
  meta?: PageMeta
}

export interface PageMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  nextCursor?: string
  queryFingerprint?: string
}

export interface Page<T> {
  items: T[]
  meta: PageMeta
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number>

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
}

/**
 * Serializes query parameters the way the backend's DTOs parse them.
 *
 * Array filters arrive as comma-joined strings because that is what the
 * backend's `toStringArray` transform splits on; repeated keys would be
 * collapsed to the last value instead.
 */
export function buildQueryString(query: Record<string, QueryValue>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","))
      continue
    }
    params.set(key, String(value))
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

function toApiError(status: number, payload: unknown): ApiError {
  const error = (payload as { error?: Record<string, unknown> } | null)?.error
  const code = typeof error?.code === "string" ? error.code : `HTTP_${status}`
  const message =
    typeof error?.message === "string"
      ? error.message
      : "تعذر إكمال الطلب. حاول مرة أخرى."
  const details = Array.isArray(error?.details)
    ? (error.details as ApiErrorDetail[]).filter(
        (detail) =>
          typeof detail?.field === "string" && typeof detail?.message === "string"
      )
    : []
  const currentVersion =
    typeof error?.currentVersion === "number" ? error.currentVersion : undefined
  return new ApiError(status, code, message, details, currentVersion)
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function send(
  path: string,
  options: RequestOptions,
  csrfToken: string | null
): Promise<Response> {
  const method = options.method ?? "GET"
  const isForm = options.body instanceof FormData
  const headers: Record<string, string> = { Accept: "application/json" }
  // A multipart body must not carry an explicit content type: the boundary is
  // generated with the body, and naming the type here strips it.
  if (options.body !== undefined && !isForm)
    headers["Content-Type"] = "application/json"
  if (csrfToken && !SAFE_METHODS.has(method)) headers[CSRF_HEADER] = csrfToken

  const url = `${API_BASE_URL}${path}${
    options.query ? buildQueryString(options.query) : ""
  }`

  try {
    return await fetch(url, {
      method,
      headers,
      credentials: "include",
      signal: options.signal,
      body:
        options.body === undefined
          ? undefined
          : isForm
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new NetworkError(error)
  }
}

/**
 * Performs one API call and unwraps its envelope.
 *
 * A rejected CSRF token is retried exactly once after re-priming: the backend
 * binds the token to the session cookie, so the first mutation after a sign-in
 * legitimately races a stale token, and failing that call to the user would be
 * a bug rather than a security signal.
 */
async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta?: PageMeta }> {
  const method = options.method ?? "GET"
  const needsCsrf = !SAFE_METHODS.has(method)
  let csrfToken = needsCsrf ? await ensureCsrfToken() : null

  let response = await send(path, options, csrfToken)
  captureCsrfToken(response)

  if (needsCsrf && response.status === 403) {
    const payload = await readPayload(response)
    const code = (payload as { error?: { code?: string } } | null)?.error?.code
    if (code !== "CSRF_INVALID") throw toApiError(403, payload)
    csrfToken = await refreshCsrfToken()
    response = await send(path, options, csrfToken)
    captureCsrfToken(response)
  }

  const payload = await readPayload(response)
  if (!response.ok) throw toApiError(response.status, payload)

  const envelope = payload as Envelope<T> | null
  return { data: (envelope?.data ?? null) as T, meta: envelope?.meta }
}

export const httpClient = {
  async get<T>(
    path: string,
    query?: Record<string, QueryValue>,
    signal?: AbortSignal
  ): Promise<T> {
    const { data } = await request<T>(path, { method: "GET", query, signal })
    return data
  },

  /** A list read, returning the envelope's pagination meta alongside the rows. */
  async getPage<T>(
    path: string,
    query?: Record<string, QueryValue>,
    signal?: AbortSignal
  ): Promise<Page<T>> {
    const { data, meta } = await request<T[]>(path, {
      method: "GET",
      query,
      signal,
    })
    const items = data ?? []
    return {
      items,
      meta: meta ?? {
        total: items.length,
        page: 1,
        limit: items.length,
        totalPages: 1,
      },
    }
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const { data } = await request<T>(path, { method: "POST", body })
    return data
  },

  /** A multipart upload; the caller assembles the `FormData` including the file. */
  async postForm<T>(
    path: string,
    form: FormData,
    signal?: AbortSignal
  ): Promise<T> {
    const { data } = await request<T>(path, {
      method: "POST",
      body: form,
      signal,
    })
    return data
  },

  /** A response the API returns as text rather than a JSON envelope (CSV). */
  async getText(
    path: string,
    query?: Record<string, QueryValue>,
    signal?: AbortSignal
  ): Promise<string> {
    const response = await send(path, { method: "GET", query, signal }, null)
    captureCsrfToken(response)
    if (!response.ok) throw toApiError(response.status, await readPayload(response))
    return response.text()
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const { data } = await request<T>(path, { method: "PATCH", body })
    return data
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const { data } = await request<T>(path, { method: "PUT", body })
    return data
  },

  async delete<T>(path: string, body?: unknown): Promise<T> {
    const { data } = await request<T>(path, { method: "DELETE", body })
    return data
  },
}
