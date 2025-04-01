"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"

interface SiteSettings {
  siteName: string
  logoUrl: string
}

interface AdminHeaderProps {
  children: React.ReactNode
}

export function AdminHeader({ children }: AdminHeaderProps) {
  // Тогтмол утгыг хасаж, хоосон утга эхлүүлэх
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "",
    logoUrl: "",
  })

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

  // Лого болон сайтын нэр харуулах хэсгийг өөрчлөх
  // Ачаалж байх үед хоосон байх, зөвхөн өгөгдлийн сангаас ирсэн мэдээлэл харагдах
  return (
    <header className="bg-[#0a0e17] border-b border-border/30">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {settings.logoUrl && <img src={settings.logoUrl || "/placeholder.svg"} alt="Logo" className="h-6 w-auto" />}
          {settings.siteName && (
            <h1 className="text-xl font-bold text-white">
              {settings.siteName}
              {settings.siteName ? " - Админ" : ""}
            </h1>
          )}
        </div>
        {children}
      </div>
    </header>
  )
}

