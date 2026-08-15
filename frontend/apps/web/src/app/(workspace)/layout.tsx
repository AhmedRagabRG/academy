import { MockSessionGate } from "@/features/auth"
import { AppShell } from "@/shared/components/layout/app-shell"

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) { return <MockSessionGate><AppShell>{children}</AppShell></MockSessionGate> }
