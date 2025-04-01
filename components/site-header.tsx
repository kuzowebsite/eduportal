"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { BookOpen } from "lucide-react"
import Link from "next/link"

interface SiteSettings {
  siteName: string
  logoUrl: string
}

interface SiteHeaderProps {
  children: React.ReactNode
  className?: string
}

export function SiteHeader({ children, className }: SiteHeaderProps) {
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "",
    logoUrl: "",
  })
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // Get site settings
    const settingsRef = ref(database, "settings")
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const settingsData = snapshot.val()
        setSettings({
          siteName: settingsData.siteName || "Нацагдорж Багшийн Номын Портал",
          logoUrl: settingsData.logoUrl || "",
        })
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      // Check if scrolled down more than 20px
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-border/40 bg-[#0a0e17]/70 backdrop-blur-md py-4 ${className}`}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl || "/placeholder.svg"}
              alt="Logo"
              className={`transition-all duration-300 ${scrolled ? "h-10 w-auto" : "h-8 w-auto"}`}
            />
          ) : (
            <BookOpen className={`transition-all duration-300 text-cyan-400 ${scrolled ? "h-10 w-10" : "h-8 w-8"}`} />
          )}
          <h1 className={`font-bold text-cyan-400 transition-all duration-300 ${scrolled ? "text-2xl" : "text-xl"}`}>
            Номын Портал
          </h1>
        </Link>

        <div className="z-50">{children}</div>
      </div>
    </header>
  )
}

