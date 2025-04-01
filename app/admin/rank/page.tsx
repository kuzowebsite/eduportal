"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, onValue, get } from "firebase/database"
import { UserNav } from "@/components/user-nav"
import { AdminSidebar, SidebarProvider } from "@/components/admin-sidebar"
import { Search, Medal } from "lucide-react"

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  profileImage?: string
}

interface UserResult {
  userId: string
  firstName: string
  lastName: string
  email: string
  totalScore: number
  testsCompleted: number
  averageScore: number
}

function AdminRankContent() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userResults, setUserResults] = useState<UserResult[]>([])
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
          setUser({ id: currentUser.uid, ...userData })

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

      // Get all test results and calculate rankings
      const resultsRef = ref(database, "results")
      const usersRef = ref(database, "users")

      const unsubscribeResults = onValue(resultsRef, async (resultsSnapshot) => {
        if (resultsSnapshot.exists()) {
          const usersSnapshot = await get(usersRef)
          const usersData = usersSnapshot.val() || {}

          const resultsData = resultsSnapshot.val()
          const userScores: Record<string, { totalScore: number; testsCompleted: number }> = {}

          // Calculate total scores for each user
          Object.values(resultsData).forEach((result: any) => {
            const userId = result.userId
            if (!userScores[userId]) {
              userScores[userId] = { totalScore: 0, testsCompleted: 0 }
            }
            userScores[userId].totalScore += result.score || 0
            userScores[userId].testsCompleted += 1
          })

          // Create ranking array with user details
          const rankingArray: UserResult[] = Object.keys(userScores).map((userId) => {
            const userData = usersData[userId] || {}
            const totalScore = userScores[userId].totalScore
            const testsCompleted = userScores[userId].testsCompleted

            return {
              userId,
              firstName: userData.firstName || "Unknown",
              lastName: userData.lastName || "User",
              email: userData.email || "",
              totalScore,
              testsCompleted,
              averageScore: testsCompleted > 0 ? totalScore / testsCompleted : 0,
            }
          })

          // Sort by total score (highest first)
          rankingArray.sort((a, b) => b.totalScore - a.totalScore)

          setUserResults(rankingArray)
        } else {
          setUserResults([])
        }
        setLoading(false)
      })

      return () => {
        unsubscribeUser()
        unsubscribeResults()
      }
    })

    return () => {
      unsubscribeAuth()
    }
  }, [router])

  const filteredResults = userResults.filter((result) => {
    const fullName = `${result.firstName} ${result.lastName}`.toLowerCase()
    const email = result.email.toLowerCase()
    const query = searchQuery.toLowerCase()

    return fullName.includes(query) || email.includes(query)
  })

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
            <h2 className="text-2xl font-bold text-white">Хэрэглэгчдийн ранк</h2>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Хэрэглэгчээр хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#0f1520]/80 border-border/10"
              />
            </div>
          </div>

          <Card className="bg-[#0f1520] border border-border/10 shadow-lg shadow-black/10">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/10">
                      <th className="px-4 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                        Ранк
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
                        Хэрэглэгч
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-cyan-300 uppercase tracking-wider">
                        Нийт оноо
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-cyan-300 uppercase tracking-wider">
                        Шалгалтын тоо
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-cyan-300 uppercase tracking-wider">
                        Дундаж оноо
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {filteredResults.length > 0 ? (
                      filteredResults.map((result, index) => (
                        <tr key={result.userId} className="hover:bg-cyan-900/10">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-white font-medium">#{index + 1}</span>
                              {index < 3 && (
                                <Medal
                                  className={`ml-2 h-4 w-4 ${
                                    index === 0 ? "text-yellow-500" : index === 1 ? "text-gray-400" : "text-amber-700"
                                  }`}
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-white">
                                {result.firstName.charAt(0)}
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-white">
                                  {result.firstName} {result.lastName}
                                </p>
                                <p className="text-xs text-gray-400">{result.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-medium text-white">{result.totalScore}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-medium text-white">{result.testsCompleted}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-medium text-white">{result.averageScore.toFixed(1)}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          {searchQuery ? "Хайлтад тохирох хэрэглэгч олдсонгүй" : "Шалгалтын дүн бүртгэгдээгүй байна"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

export default function AdminRankPage() {
  return (
    <SidebarProvider>
      <AdminRankContent />
    </SidebarProvider>
  )
}

