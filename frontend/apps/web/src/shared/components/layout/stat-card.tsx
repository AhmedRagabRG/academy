import { Card } from "./card"
// `min-w-0` on the text column: without it a long value — a formatted money
// amount above all — refuses to shrink inside the flex row and spills out of
// the card instead of truncating within it.
export function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <Card><div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-muted-foreground text-sm">{label}</p><p className="mt-2 truncate text-2xl font-semibold">{value}</p></div>{icon}</div></Card> }
