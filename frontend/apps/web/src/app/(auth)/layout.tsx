export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="brand-grid relative grid min-h-svh place-items-center overflow-hidden p-6 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_20%,rgba(31,90,138,0.58),transparent_38%)] after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-brand-gold">{children}</main>
}
