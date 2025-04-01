"use client"

import Link from "next/link"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { auth, database } from "@/lib/firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { ref, set } from "firebase/database"

export default function AdminSetupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    let isValid = true
    const newErrors = { ...errors }

    // Validate fields
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Овог оруулна уу"
      isValid = false
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "Нэр оруулна уу"
      isValid = false
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Утасны дугаар оруулна уу"
      isValid = false
    } else if (!/^\d{8}$/.test(formData.phone)) {
      newErrors.phone = "Утасны дугаар 8 оронтой байх ёстой"
      isValid = false
    }

    if (!formData.email.trim()) {
      newErrors.email = "Имэйл хаяг оруулна уу"
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Имэйл хаяг буруу байна"
      isValid = false
    }

    if (!formData.password) {
      newErrors.password = "Нууц үг оруулна уу"
      isValid = false
    } else if (formData.password.length < 6) {
      newErrors.password = "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой"
      isValid = false
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Нууц үг таарахгүй байна"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      try {
        setLoading(true)

        // Create user with Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)

        // Get the user ID from the newly created user
        const userId = userCredential.user.uid

        // Store additional user data in Firebase Realtime Database
        await set(ref(database, `users/${userId}`), {
          lastName: formData.lastName,
          firstName: formData.firstName,
          phone: formData.phone,
          email: formData.email,
          role: "admin", // Set role as admin
          createdAt: new Date().toISOString(),
        })

        toast({
          title: "Админ бүртгэл амжилттай",
          description: "Админ бүртгэл амжилттай үүслээ. Одоо нэвтэрч болно.",
        })

        // Redirect to login page
        setTimeout(() => {
          router.push("/login")
        }, 1500)
      } catch (error: any) {
        console.error("Admin registration error:", error)

        // Handle specific Firebase errors
        if (error.code === "auth/email-already-in-use") {
          setErrors((prev) => ({ ...prev, email: "Энэ имэйл хаяг бүртгэлтэй байна" }))
        } else {
          toast({
            title: "Алдаа гарлаа",
            description: "Бүртгэл үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.",
            variant: "destructive",
          })
        }
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Админ бүртгэл үүсгэх</CardTitle>
          <CardDescription className="text-center">Шинэ админ бүртгэл үүсгэнэ үү</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lastName">Овог</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Овог"
                value={formData.lastName}
                onChange={handleChange}
              />
              {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">Нэр</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Нэр"
                value={formData.firstName}
                onChange={handleChange}
              />
              {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Утасны дугаар</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="Утасны дугаар"
                value={formData.phone}
                onChange={handleChange}
              />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Имэйл</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
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
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Нууц үгийг давтах</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Нууц үгийг давтах"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Бүртгэж байна..." : "Админ бүртгэл үүсгэх"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Бүртгэлтэй юу?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Нэвтрэх
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

