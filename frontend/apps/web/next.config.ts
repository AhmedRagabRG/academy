import type { NextConfig } from "next"
import path from "node:path"

/**
 * Where the Next server forwards `/api/v1/*` during development.
 *
 * The proxy exists so the browser talks to the API on its own origin. The
 * session is an httpOnly cookie: same-origin means it is sent and set without
 * the backend having to allow-list every frontend origin for credentialed
 * CORS, and without `SameSite` rules applying at all.
 */
const apiOrigin = process.env.API_PROXY_ORIGIN ?? "http://localhost:3001"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  async rewrites() {
    // A caller that points NEXT_PUBLIC_API_BASE_URL at an absolute URL is
    // addressing the API directly, so the proxy would only shadow it.
    if (process.env.NEXT_PUBLIC_API_BASE_URL) return []
    return [
      { source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` },
      // Uploaded documents are served by the API at its own `/files` root, and
      // the links it returns are origin-relative. Without this they resolve
      // against the Next server and 404, so every document preview is dead.
      { source: "/files/:path*", destination: `${apiOrigin}/files/:path*` },
    ]
  },
}

export default nextConfig
