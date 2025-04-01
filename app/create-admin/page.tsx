"use client"

import { useState, useEffect } from "react"
import { auth, database, setUserAsAdmin } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { ref, get } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function CreateAdminPage() {
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)

        // Check if user is already admin
        const userRef = ref(database, `users/${user.uid}`)
        const snapshot = await get(userRef)

        if (snapshot.exists()) {
          const userData = snapshot.val()
          setIsAdmin(userData.role === "admin")
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const makeAdmin = async () => {
    if (!currentUser) return

    try {
      setProcessing(true)
      await setUserAsAdmin(currentUser.uid)
      setIsAdmin(true)
      toast({
        title: "Амжилттай",
        description: "Таны эрх админ болж өөрчлөгдлөө",
      })
    } catch (error) {
      console.error("Error making admin:", error)
      toast({
        title: "Алдаа гарлаа",
        description: "Админ болгоход алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p>
          Та нэвтрээгүй байна. Эхлээд{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            нэвтэрнэ үү
          </a>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Админ эрх үүсгэх</CardTitle>
          <CardDescription className="text-center">Одоогийн хэрэглэгчид админ эрх олгох</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="font-medium">Хэрэглэгчийн мэдээлэл:</p>
            <p>Имэйл: {currentUser.email}</p>
            <p>Статус: {isAdmin ? "Админ" : "Энгийн хэрэглэгч"}</p>
          </div>

          {isAdmin ? (
            <div className="bg-green-50 p-4 rounded-md text-green-700">
              <p>Таны бүртгэл админ эрхтэй байна.</p>
              <p className="mt-2">
                <a href="/admin/dashboard" className="text-blue-600 hover:underline">
                  Админ хэсэгт очих
                </a>
              </p>
            </div>
          ) : (
            <Button onClick={makeAdmin} className="w-full" disabled={processing}>
              {processing ? "Боловсруулж байна..." : "Админ болгох"}
            </Button>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            <a href="/" className="text-blue-600 hover:underline">
              Нүүр хуудас руу буцах
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

