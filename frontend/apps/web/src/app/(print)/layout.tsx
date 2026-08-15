import { MockSessionGate } from "@/features/auth"

/**
 * Documents meant for paper.
 *
 * Sits outside `(workspace)` so the sidebar and header are never in the
 * document at all — hiding them with print rules instead would still leave
 * their layout affecting the page box. The session gate stays: a printable
 * invoice is no less confidential than the screen it came from.
 */
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MockSessionGate>{children}</MockSessionGate>
}
