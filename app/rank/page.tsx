"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Search, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, get } from "firebase/database"
import { UserNav } from "@/components/user-nav"
import { Footer } from "@/components/footer"
import { SiteHeader } from "@/components/site-header"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  profileImage?: string
  showInRank?: boolean
}

interface UserRank {
  id: string
  firstName: string
  lastName: string
  email: string
  profileImage?: string
  averageScore: number
  testsCount: number
  passedCount: number
  rank: number
}

export default function RankPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<UserRank[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        router.push("/login")
        return
      }

      // Get current user data
      const userRef = ref(database, `users/${authUser.uid}`)
      const userSnapshot = await get(userRef)

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val()
        setCurrentUser({
          id: authUser.uid,
          ...userData,
        })

        // Get all users and their test results
        const usersRef = ref(database, "users")
        const resultsRef = ref(database, "results")

        // Get all users
        const usersSnapshot = await get(usersRef)
        const resultsSnapshot = await get(resultsRef)

        if (usersSnapshot.exists() && resultsSnapshot.exists()) {
          const usersData = usersSnapshot.val()
          const resultsData = resultsSnapshot.val()

          // Calculate average scores for each user
          const userScores: Record<string, { totalScore: number; count: number; passedCount: number }> = {}

          // Process all results
          Object.values(resultsData).forEach((result: any) => {
            const userId = result.userId
            if (!userId) return

            // Initialize user score if not exists
            if (!userScores[userId]) {
              userScores[userId] = { totalScore: 0, count: 0, passedCount: 0 }
            }

            // Add score to user's total
            userScores[userId].totalScore += result.percentage || 0
            userScores[userId].count += 1

            // Count passed tests
            if (result.passed) {
              userScores[userId].passedCount += 1
            }
          })

          // Create user rank list
          const userRankList: UserRank[] = []

          Object.keys(usersData).forEach((userId) => {
            const user = usersData[userId]

            // Skip admin users
            if (user.role === "admin") return

            // Skip users who don't want to be in rank
            if (user.showInRank === false) return

            // Calculate average score
            const userScore = userScores[userId] || { totalScore: 0, count: 0, passedCount: 0 }
            const averageScore =
              userScore.count > 0 ? Number.parseFloat((userScore.totalScore / userScore.count).toFixed(2)) : 0

            // Only include users who have taken at least one test
            if (userScore.count > 0) {
              userRankList.push({
                id: userId,
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                email: user.email || "",
                profileImage: user.profileImage || "",
                averageScore,
                testsCount: userScore.count,
                passedCount: userScore.passedCount,
                rank: 0, // Will be set after sorting
              })
            }
          })

          // Sort by average score (descending)
          userRankList.sort((a, b) => b.averageScore - a.averageScore)

          // Assign ranks
          userRankList.forEach((user, index) => {
            user.rank = index + 1
          })

          setUsers(userRankList)
        }
      } else {
        // User data not found in database
        signOut(auth).then(() => {
          router.push("/login")
        })
      }

      setLoading(false)
    })

    return () => {
      unsubscribeAuth()
    }
  }, [router])

  // Filter users by search query
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true

    const fullName = `${user.lastName} ${user.firstName}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase().trim())
  })

  // Get initials from first and last name
  const getInitials = (firstName: string, lastName: string) => {
    const firstInitial = firstName ? firstName.charAt(0) : ""
    const lastInitial = lastName ? lastName.charAt(0) : ""
    return (firstInitial + lastInitial).toUpperCase()
  }

  if (loading) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  if (!currentUser) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      <SiteHeader>
        <div className="flex items-center gap-4">
          <UserNav user={currentUser} />
        </div>
      </SiteHeader>

      <main className="container mx-auto px-4 py-8 flex-1 pt-16">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="back" size="icon" asChild>
            <Link href="/dashboard">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h2 className="text-2xl font-bold text-white">Хэрэглэгчдийн ранк</h2>
        </div>

        <div className="mb-6 flex">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-cyan-400" />
            <Input
              placeholder="Хэрэглэгчийн нэрээр хайх..."
              className="pl-8 bg-card/50 border-border/30 text-white placeholder:text-cyan-400/70"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg shadow-black/10 border border-border/30">
            <p className="text-cyan-300/80">Одоогоор ранк дээр хэрэглэгч байхгүй байна.</p>
          </div>
        ) : (
          <div className="bg-card/80 backdrop-blur-sm rounded-lg shadow-lg shadow-black/10 overflow-hidden border border-border/30">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="w-16 text-cyan-300">Ранк</TableHead>
                  <TableHead className="text-cyan-300">Хэрэглэгч</TableHead>
                  <TableHead className="text-cyan-300">Дүнгийн голч</TableHead>
                  <TableHead className="text-cyan-300">Тэнцсэн шалгалт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className={`border-border/30 hover:bg-card/50 ${user.id === currentUser.id ? "bg-blue-900/20" : ""}`}
                  >
                    <TableCell>
                      <div className="flex justify-center">
                        {user.rank <= 3 ? (
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full ${
                              user.rank === 1
                                ? "bg-yellow-100 text-yellow-600"
                                : user.rank === 2
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-amber-100 text-amber-600"
                            }`}
                          >
                            <Trophy className="h-4 w-4" />
                          </div>
                        ) : (
                          <span className="font-medium">{user.rank}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {user.profileImage ? (
                            <AvatarImage src={user.profileImage} alt={`${user.firstName} ${user.lastName}`} />
                          ) : null}
                          <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.lastName} {user.firstName}
                            {user.id === currentUser.id && " (Та)"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-medium ${
                          user.averageScore >= 90
                            ? "text-green-600"
                            : user.averageScore >= 70
                              ? "text-blue-600"
                              : "text-red-600"
                        }`}
                      >
                        {user.averageScore}%
                      </span>
                    </TableCell>
                    <TableCell>{user.passedCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

