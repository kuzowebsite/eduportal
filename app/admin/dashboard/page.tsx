"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Users, FileText, Plus, Settings, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, onValue } from "firebase/database"
import { UserNav } from "@/components/user-nav"
import { AdminSidebar, SidebarProvider } from "@/components/admin-sidebar"

interface User {
  firstName: string
  lastName: string
  email: string
  role: string
  profileImage?: string
}

interface Stats {
  totalUsers: number
  totalTests: number
}

// Wrapper component that provides the SidebarProvider
function AdminDashboardContent() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTests: 0,
  })
  const [loading, setLoading] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        console.log("No user logged in, redirecting to login")
        router.push("/login")
        return
      }

      console.log("Current user:", currentUser.uid)

      // Get user data from database
      const userRef = ref(database, `users/${currentUser.uid}`)
      const unsubscribeUser = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val()
          console.log("User data:", userData)
          setUser(userData)

          // Check if user is admin
          if (userData.role !== "admin") {
            console.log("User is not admin, redirecting to dashboard")
            router.push("/dashboard")
          } else {
            console.log("User is admin, staying on admin dashboard")
          }
        } else {
          // User data not found in database
          console.log("User data not found in database")
          signOut(auth).then(() => {
            router.push("/login")
          })
        }
      })

      // Get stats
      const usersRef = ref(database, "users")
      const unsubscribeUsers = onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
          const usersData = snapshot.val()
          // Зөвхөн энгийн хэрэглэгчдийг тоолох (админ биш)
          const regularUsers = Object.values(usersData).filter((user: any) => user.role !== "admin").length
          setStats((prev) => ({ ...prev, totalUsers: regularUsers }))
        }
      })

      const testsRef = ref(database, "tests")
      const unsubscribeTests = onValue(testsRef, (snapshot) => {
        if (snapshot.exists()) {
          const testsCount = Object.keys(snapshot.val()).length
          setStats((prev) => ({ ...prev, totalTests: testsCount }))
        }
        setLoading(false)
      })

      return () => {
        unsubscribeUser()
        unsubscribeUsers()
        unsubscribeTests()
      }
    })

    return () => {
      unsubscribeAuth()
    }
  }, [router])

  if (loading) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  if (!user) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] flex">
      <AdminSidebar />

      <div ref={contentRef} className="flex-1 ml-64">
        <header className="border-b border-border/10 h-16 flex items-center px-6 bg-[#0f1520]/80 backdrop-blur-sm">
          <div className="ml-auto">
            <UserNav user={user} />
          </div>
        </header>

        <main className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Админ хяналтын самбар</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-cyan-300">Нийт хэрэглэгч (админ хасч)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-500 mr-2" />
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-cyan-300">Нийт шалгалт</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-green-500 mr-2" />
                  <p className="text-2xl font-bold">{stats.totalTests}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
              <CardHeader>
                <CardTitle className="text-white">Шалгалтууд</CardTitle>
                <CardDescription className="text-cyan-300/80">Шалгалтуудыг удирдах</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <Button asChild className="w-full">
                    <Link href="/admin/tests">
                      <FileText className="mr-2 h-4 w-4" />
                      Шалгалтуудыг харах
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/admin/tests/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Шинэ шалгалт нэмэх
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
              <CardHeader>
                <CardTitle className="text-white">Хэрэглэгчид</CardTitle>
                <CardDescription className="text-cyan-300/80">Хэрэглэгчдийг удирдах</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <Button asChild className="w-full">
                    <Link href="/admin/users">
                      <Users className="mr-2 h-4 w-4" />
                      Хэрэглэгчдийг харах
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
              <CardHeader>
                <CardTitle className="text-white">Тохиргоо</CardTitle>
                <CardDescription className="text-cyan-300/80">Сайтын тохиргоог удирдах</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <Button asChild className="w-full">
                    <Link href="/admin/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Сайтын тохиргоо
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
              <CardHeader>
                <CardTitle className="text-white">Хэрэглэгчдийн ранк</CardTitle>
                <CardDescription className="text-cyan-300/80">Хэрэглэгчдийн ранкийг харах</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <Button asChild className="w-full">
                    <Link href="/admin/rank">
                      <Trophy className="mr-2 h-4 w-4" />
                      Ранк харах
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

// Main component that wraps the content with SidebarProvider
export default function AdminDashboardPage() {
  return (
    <SidebarProvider>
      <AdminDashboardContent />
    </SidebarProvider>
  )
}

