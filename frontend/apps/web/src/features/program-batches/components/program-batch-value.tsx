export function BatchValue({ children }: { children: React.ReactNode }) {
  return (
    <bdi dir="ltr" className="tabular-nums">
      {children}
    </bdi>
  )
}
