"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, onValue, update } from "firebase/database"
import { UserNav } from "@/components/user-nav"
import { AdminSidebar, SidebarProvider } from "@/components/admin-sidebar"
import { Save } from "lucide-react"

interface User {
  firstName: string
  lastName: string
  email: string
  role: string
  profileImage?: string
}

interface SiteSettings {
  siteName: string
  siteDescription: string
  welcomeMessage: string
  footerText: string
  contactEmail: string
  termsAndConditions: string
  privacyPolicy: string
}

function AdminSettingsContent() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "Номын Портал",
    siteDescription: "Онлайн шалгалтын систем",
    welcomeMessage: "Тавтай морил!",
    footerText: "© 2023 Номын Портал. Бүх эрх хуулиар хамгаалагдсан.",
    contactEmail: "info@example.com",
    termsAndConditions: "",
    privacyPolicy: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }

      // Get user data from database
      const userRef = ref(database, `users/${currentUser.uid}`)
      const unsubscribeUser = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val()
          setUser(userData)

          // Check if user is admin
          if (userData.role !== "admin") {
            router.push("/dashboard")
          }
        } else {
          signOut(auth).then(() => {
            router.push("/login")
          })
        }
      })

      // Get site settings
      const settingsRef = ref(database, "settings")
      const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
          const settingsData = snapshot.val()
          setSettings((prevSettings) => ({
            ...prevSettings,
            ...settingsData,
          }))
        }
        setLoading(false)
      })

      return () => {
        unsubscribeUser()
        unsubscribeSettings()
      }
    })

    return () => {
      unsubscribeAuth()
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const settingsRef = ref(database, "settings")
      await update(settingsRef, settings)
      alert("Тохиргоо амжилттай хадгалагдлаа")
    } catch (error) {
      console.error("Error saving settings:", error)
      alert("Тохиргоо хадгалахад алдаа гарлаа")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  if (!user) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] flex">
      <AdminSidebar />

      <div className="flex-1 ml-64">
        <header className="border-b border-border/10 h-16 flex items-center px-6 bg-[#0f1520]/80 backdrop-blur-sm">
          <div className="ml-auto">
            <UserNav user={user} />
          </div>
        </header>

        <main className="p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">Сайтын тохиргоо</h2>
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-[#0f1520] border border-border/10 shadow-lg shadow-black/10">
              <CardHeader>
                <CardTitle className="text-white">Үндсэн тохиргоо</CardTitle>
                <CardDescription className="text-cyan-300/80">Сайтын үндсэн мэдээллийг тохируулах</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="siteName" className="text-sm font-medium text-white">
                    Сайтын нэр
                  </label>
                  <Input
                    id="siteName"
                    name="siteName"
                    value={settings.siteName}
                    onChange={handleInputChange}
                    className="bg-[#0a0e17] border-border/10"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="siteDescription" className="text-sm font-medium text-white">
                    Сайтын тайлбар
                  </label>
                  <Input
                    id="siteDescription"
                    name="siteDescription"
                    value={settings.siteDescription}
                    onChange={handleInputChange}
                    className="bg-[#0a0e17] border-border/10"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="welcomeMessage" className="text-sm font-medium text-white">
                    Угтах мессеж
                  </label>
                  <Input
                    id="welcomeMessage"
                    name="welcomeMessage"
                    value={settings.welcomeMessage}
                    onChange={handleInputChange}
                    className="bg-[#0a0e17] border-border/10"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="contactEmail" className="text-sm font-medium text-white">
                    Холбоо барих имэйл
                  </label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={settings.contactEmail}
                    onChange={handleInputChange}
                    className="bg-[#0a0e17] border-border/10"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="footerText" className="text-sm font-medium text-white">
                    Хөлний текст
                  </label>
                  <Input
                    id="footerText"
                    name="footerText"
                    value={settings.footerText}
                    onChange={handleInputChange}
                    className="bg-[#0a0e17] border-border/10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f1520] border border-border/10 shadow-lg shadow-black/10">
              <CardHeader>
                <CardTitle className="text-white">Нөхцөл ба бодлого</CardTitle>
                <CardDescription className="text-cyan-300/80">Хэрэглэгчийн нөхцөл ба нууцлалын бодлого</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="termsAndConditions" className="text-sm font-medium text-white">
                    Үйлчилгээний нөхцөл
                  </label>
                  <Textarea
                    id="termsAndConditions"
                    name="termsAndConditions"
                    value={settings.termsAndConditions}
                    onChange={handleInputChange}
                    className="min-h-[200px] bg-[#0a0e17] border-border/10"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="privacyPolicy" className="text-sm font-medium text-white">
                    Нууцлалын бодлого
                  </label>
                  <Textarea
                    id="privacyPolicy"
                    name="privacyPolicy"
                    value={settings.privacyPolicy}
                    onChange={handleInputChange}
                    className="min-h-[200px] bg-[#0a0e17] border-border/10"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  return (
    <SidebarProvider>
      <AdminSettingsContent />
    </SidebarProvider>
  )
}

