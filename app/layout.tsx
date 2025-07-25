import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ship of Thesis",
  description: "Your AI Writing Assistant for thesis and academic papers.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <main id="main-content" className="min-h-screen focus:outline-none focus-visible:ring-0">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
