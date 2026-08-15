export function BidiValue({ children }: { children: React.ReactNode }) {
  return (
    <bdi dir="ltr" className="font-mono text-xs">
      {children}
    </bdi>
  )
}
