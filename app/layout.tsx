import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Нацагдорж Багшийн Номын Портал",
  description: "Тусгай эрхтэй хэрэглэгчдэд зориулсан онлайн сургалтын платформ",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  )
}



import './globals.css'