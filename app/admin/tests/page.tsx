"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, onValue, remove } from "firebase/database"
import { UserNav } from "@/components/user-nav"
import { AdminSidebar, SidebarProvider } from "@/components/admin-sidebar"
import { PlusCircle, Pencil, Trash2, Search } from "lucide-react"

interface User {
  firstName: string
  lastName: string
  email: string
  role: string
  profileImage?: string
}

interface Test {
  id: string
  title: string
  description: string
  timeLimit: number
  questions: any[]
  createdAt: number
}

function AdminTestsContent() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

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

      // Get tests data
      const testsRef = ref(database, "tests")
      const unsubscribeTests = onValue(testsRef, (snapshot) => {
        if (snapshot.exists()) {
          const testsData = snapshot.val()
          const testsArray = Object.keys(testsData).map((key) => ({
            id: key,
            ...testsData[key],
          }))

          // Sort by createdAt (newest first)
          testsArray.sort((a, b) => b.createdAt - a.createdAt)

          setTests(testsArray)
        } else {
          setTests([])
        }
        setLoading(false)
      })

      return () => {
        unsubscribeUser()
        unsubscribeTests()
      }
    })

    return () => {
      unsubscribeAuth()
    }
  }, [router])

  const handleDeleteTest = async (testId: string) => {
    if (window.confirm("Та энэ шалгалтыг устгахдаа итгэлтэй байна уу?")) {
      try {
        const testRef = ref(database, `tests/${testId}`)
        await remove(testRef)
        alert("Шалгалт амжилттай устгагдлаа")
      } catch (error) {
        console.error("Error deleting test:", error)
        alert("Шалгалт устгахад алдаа гарлаа")
      }
    }
  }

  const filteredTests = tests.filter((test) => test.title.toLowerCase().includes(searchQuery.toLowerCase()))

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
            <h2 className="text-2xl font-bold text-white">Шалгалтууд</h2>
            <Button asChild>
              <Link href="/admin/tests/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Шинэ шалгалт нэмэх
              </Link>
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Шалгалтаар хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#0f1520]/80 border-border/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {filteredTests.length > 0 ? (
              filteredTests.map((test) => (
                <Card key={test.id} className="bg-[#0f1520] border border-border/10 shadow-lg shadow-black/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-white">{test.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{test.description}</p>
                    <p className="text-xs text-cyan-400 mb-4">
                      {test.questions?.length || 0} асуулт • {test.timeLimit} минут
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/admin/tests/edit/${test.id}`}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Засах
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDeleteTest(test.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Устгах
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-400">
                {searchQuery ? "Хайлтад тохирох шалгалт олдсонгүй" : "Шалгалт байхгүй байна"}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminTestsPage() {
  return (
    <SidebarProvider>
      <AdminTestsContent />
    </SidebarProvider>
  )
}

