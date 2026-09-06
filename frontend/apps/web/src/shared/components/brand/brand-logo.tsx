import Image from "next/image"
import logo from "@/shared/assets/brand-logo.png"
import mark from "@/shared/assets/brand-mark.png"
import { cn } from "@workspace/ui/lib/utils"

interface BrandLogoProps {
  variant?: "full" | "mark"
  className?: string
  priority?: boolean
}

export function BrandLogo({ variant = "full", className, priority = false }: BrandLogoProps) {
  if (variant === "mark") {
    return (
      <span className={cn("relative block size-9 shrink-0", className)}>
        <Image
          src={mark}
          alt=""
          loading={priority ? "eager" : undefined}
          sizes="40px"
          className="size-full object-contain"
        />
        <span className="sr-only">أكاديمية السلام المهني</span>
      </span>
    )
  }

  return (
    <Image
      src={logo}
      alt="أكاديمية السلام المهني — تطوير المهارات، بناء المستقبل"
      loading={priority ? "eager" : undefined}
      sizes="(max-width: 640px) 180px, 220px"
      className={cn("h-auto w-44 object-contain", className)}
    />
  )
}
