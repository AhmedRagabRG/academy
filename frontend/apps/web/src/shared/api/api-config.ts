/**
 * Where the API lives, from the browser's point of view.
 *
 * The default is the *same-origin* `/api/v1`, which `next.config.ts` rewrites
 * onto the backend. Going through the rewrite rather than straight to
 * `localhost:3001` is deliberate: the session is a cookie, and a same-origin
 * request carries it without needing the backend's CORS allowlist to name
 * every frontend origin, and without `SameSite` ever coming into play.
 *
 * Set `NEXT_PUBLIC_API_BASE_URL` to bypass the rewrite (a deployed API on its
 * own domain); the backend must then allow that origin with credentials.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "/api/v1"

/** The header carrying the readable half of the double-submit CSRF pair. */
export const CSRF_HEADER = "x-csrf-token"

/** Methods the backend exempts from CSRF validation. */
export const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])
