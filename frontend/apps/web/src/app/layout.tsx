import type { Metadata } from "next"
import { Alexandria } from "next/font/google"
import "@workspace/ui/globals.css"
import { AppProviders } from "@/shared/providers/app-providers"

const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  variable: "--font-alexandria",
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: "منصة السلام للعمليات", template: "%s | منصة السلام" },
  description: "منصة موحدة لإدارة العمليات التعليمية",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={alexandria.variable} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
