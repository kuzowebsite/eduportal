"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { auth, database } from "@/lib/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { ref, get } from "firebase/database"
import { Footer } from "@/components/footer"
import { SiteHeader } from "@/components/site-header"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    identifier: "", // phone, email, or name
    password: "",
  })
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.identifier.trim()) {
      setError("Нэвтрэх нэр оруулна уу")
      return
    }

    if (!formData.password) {
      setError("Нууц үг оруулна уу")
      return
    }

    try {
      setLoading(true)

      // Определяем тип идентификатора
      let loginMethod = "email"
      const identifier = formData.identifier.trim()

      // Проверяем, является ли идентификатор email
      if (identifier.includes("@")) {
        loginMethod = "email"
      }
      // Проверяем, является ли идентификатор телефоном (только цифры и длина 8)
      else if (/^\d{8}$/.test(identifier)) {
        loginMethod = "phone"
      }
      // В остальных случаях считаем, что это имя
      else {
        loginMethod = "name"
      }

      // Для email используем Firebase Authentication напрямую
      if (loginMethod === "email") {
        await signInWithEmailAndPassword(auth, identifier, formData.password)

        // Get user data from database
        const user = auth.currentUser
        if (user) {
          const userRef = ref(database, `users/${user.uid}`)
          const snapshot = await get(userRef)

          if (snapshot.exists()) {
            const userData = snapshot.val()

            // Check if user is active
            if (userData.active === false) {
              // Sign out the user if they are inactive
              await auth.signOut()
              setError("Таны бүртгэл идэвхгүй байна. Админтай холбогдоно уу.")
              return
            }

            // Check if user is admin
            if (userData.role === "admin") {
              router.push("/admin/dashboard")
            } else {
              router.push("/dashboard")
            }

            toast({
              title: "Амжилттай нэвтэрлээ",
              description: `Сайн байна уу, ${userData.firstName}!`,
            })
          }
        }
      } else {
        // Для телефона или имени ищем пользователя в базе данных
        const usersRef = ref(database, "users")
        const snapshot = await get(usersRef)

        if (snapshot.exists()) {
          let foundUser = null
          let userId = null

          // Ищем пользователя по телефону или имени
          snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val()
            if (
              (loginMethod === "phone" && userData.phone === identifier) ||
              (loginMethod === "name" && userData.firstName === identifier)
            ) {
              foundUser = userData
              userId = childSnapshot.key
            }
          })

          if (foundUser) {
            // Проверяем, активен ли пользователь
            if (foundUser.active === false) {
              setError("Таны бүртгэл идэвхгүй байна. Админтай холбогдоно уу.")
              return
            }

            // Пытаемся войти с email, связанным с этим пользователем
            try {
              await signInWithEmailAndPassword(auth, foundUser.email, formData.password)

              // Проверяем, является ли пользователь админом
              if (foundUser.role === "admin") {
                router.push("/admin/dashboard")
              } else {
                router.push("/dashboard")
              }

              toast({
                title: "Амжилттай нэвтэрлээ",
                description: `Сайн байна уу, ${foundUser.firstName}!`,
              })
            } catch (error) {
              setError("Нууц үг буруу байна")
            }
          } else {
            setError(
              loginMethod === "phone" ? "Энэ утасны дугаартай хэрэглэгч олдсонгүй" : "Энэ нэртэй хэрэглэгч олдсонгүй",
            )
          }
        }
      }
    } catch (error: any) {
      console.error("Login error:", error)

      // Handle specific Firebase errors
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        setError("Нэвтрэх нэр эсвэл нууц үг буруу байна")
      } else if (error.code === "auth/too-many-requests") {
        setError("Хэт олон удаа буруу оролдлого хийсэн тул түр хүлээнэ үү")
      } else {
        setError("Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SiteHeader>
        <div></div>
      </SiteHeader>

      <div className="container mx-auto px-4 py-10">
        <Card className="max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Нэвтрэх</CardTitle>
            <CardDescription className="text-center">Бүртгэлтэй хэрэглэгч нэвтрэх</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Нэвтрэх нэр</Label>
                  <Input
                    id="identifier"
                    name="identifier"
                    placeholder="Утас, Имэйл эсвэл Нэр"
                    value={formData.identifier}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Нууц үг</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Нууц үг"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Бүртгэлгүй юу?{" "}
              <Link href="/register" className="text-blue-600 hover:underline">
                Бүртгүүлэх
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>

      <Footer />
    </>
  )
}

