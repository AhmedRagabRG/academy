import { API_BASE_URL, CSRF_HEADER } from "./api-config"

/**
 * The double-submit CSRF token, held in memory only.
 *
 * The backend keeps the paired secret in an httpOnly `csrf_token` cookie and
 * hands the readable half back on the `x-csrf-token` response header of
 * `GET /auth/session`. It binds that token to the current `access_token`
 * cookie, so **the token minted before a sign-in stops validating after it** —
 * anything that changes the session (sign-in, sign-out) has to re-prime. That
 * is why this lives in a module variable rather than a cookie or storage: it
 * has to be discarded the moment the session identity changes.
 */
let token: string | null = null
let inflight: Promise<string | null> | null = null

export const getCsrfToken = () => token

/** Records the token from any response that carries one. */
export function captureCsrfToken(response: Response): void {
  const header = response.headers.get(CSRF_HEADER)
  if (header) token = header
}

export function clearCsrfToken(): void {
  token = null
}

/**
 * Mints a token by touching the one endpoint that issues them.
 *
 * Concurrent callers share a single in-flight request so a burst of mutations
 * on a cold client does not fire a burst of session reads.
 */
export function primeCsrfToken(): Promise<string | null> {
  inflight ??= fetch(`${API_BASE_URL}/auth/session`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  })
    .then((response) => {
      captureCsrfToken(response)
      return token
    })
    .catch(() => null)
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Re-mints the token after the session identity changes. */
export async function refreshCsrfToken(): Promise<string | null> {
  clearCsrfToken()
  return primeCsrfToken()
}

export const ensureCsrfToken = (): Promise<string | null> =>
  token ? Promise.resolve(token) : primeCsrfToken()
