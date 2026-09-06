import { cn } from "@workspace/ui/lib/utils"

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1600px] p-3 sm:p-4 lg:p-6", className)}>{children}</div>
}
