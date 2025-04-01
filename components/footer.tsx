"use client"

import { useEffect, useState } from "react"
import { Mail, Phone, BookOpen } from "lucide-react"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"

interface SiteSettings {
  siteName: string
  logoUrl: string
  contactPhone: string
  contactEmail: string
  contactAddress: string
  footerText: string
}

export function Footer() {
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "",
    logoUrl: "",
    contactPhone: "",
    contactEmail: "",
    contactAddress: "",
    footerText: "",
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
          contactPhone: settingsData.contactPhone || "+976 99112233",
          contactEmail: settingsData.contactEmail || "natsagdorj@gmail.com",
          contactAddress: settingsData.contactAddress || "Улаанбаатар хот, Сүхбаатар дүүрэг\nМонгол улс",
          footerText:
            settingsData.footerText ||
            "Тусгай эрхтэй хэрэглэгчдэд зориулсан онлайн сургалтын платформ. Шалгалт өгөх, дүнгээ харах, мэдлэгээ сорих боломжийг олгоно.",
        })
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <footer className="bg-[#0a0e17] border-t border-border/20">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Site Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img src={settings.logoUrl || "/placeholder.svg"} alt="Logo" className="h-8 w-auto" />
              ) : (
                <BookOpen className="h-8 w-8 text-cyan-400" />
              )}
              <h2 className="text-xl font-bold text-cyan-400">Номын Портал</h2>
            </div>
            <p className="text-cyan-300/70 text-sm leading-relaxed">
              Тусгай эрхтэй хэрэглэгчдэд зориулсан онлайн сургалтын платформ. Шалгалт өгөх, дүнгээ харах, мэдлэгээ сорих
              боломжийг олгоно.
            </p>
          </div>

          {/* Contact Information */}
          <div className="md:text-right space-y-2">
            <h3 className="text-lg font-semibold text-cyan-400 pb-1">Холбоо барих</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 md:justify-end text-sm">
                <Phone className="h-4 w-4 text-cyan-400" />
                <span className="text-cyan-300/80">{settings.contactPhone}</span>
              </div>
              <div className="flex items-center gap-3 md:justify-end text-sm">
                <Mail className="h-4 w-4 text-cyan-400" />
                <span className="text-cyan-300/80">{settings.contactEmail}</span>
              </div>
              <div className="text-cyan-300/80 text-sm">
                <p className="whitespace-pre-line md:text-right">{settings.contactAddress}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-cyan-900/30 text-center">
          <p className="text-xs text-cyan-300/50">
            © {new Date().getFullYear()} Нацагдорж Багшийн Номын Портал. Бүх эрх хуулиар хамгаалагдсан.
          </p>
        </div>
      </div>
    </footer>
  )
}

