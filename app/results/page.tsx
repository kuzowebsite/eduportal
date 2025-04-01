"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, onValue, get } from "firebase/database"
import { UserNav } from "@/components/user-nav"
import { Footer } from "@/components/footer"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface User {
  firstName: string
  lastName: string
  email: string
  id: string
  profileImage?: string
}

interface TestResult {
  id: string
  testId: string
  testTitle?: string
  score: number
  totalPoints: number
  percentage: number
  passed: boolean
  completedAt: string
  attempts?: number
  passedCount?: number
}

export default function ResultsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [averageScore, setAverageScore] = useState<number | null>(null)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }

      // Get user data from database
      const userRef = ref(database, `users/${currentUser.uid}`)
      const userSnapshot = await get(userRef)

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val()
        setUser({
          ...userData,
          id: currentUser.uid,
        })

        // If user is admin, redirect to admin dashboard
        if (userData.role === "admin") {
          router.push("/admin/dashboard")
          return
        }

        // Get all tests to get their titles
        const testsRef = ref(database, "tests")
        const testsSnapshot = await get(testsRef)
        const testsData = testsSnapshot.exists() ? testsSnapshot.val() : {}

        // Get user's test results
        const resultsRef = ref(database, "results")
        const unsubscribeResults = onValue(resultsRef, (snapshot) => {
          if (snapshot.exists()) {
            const resultsData = snapshot.val()

            // Get all user results
            const allUserResults = Object.keys(resultsData)
              .filter((key) => resultsData[key].userId === currentUser.uid)
              .map((key) => ({
                id: key,
                ...resultsData[key],
                testTitle: testsData[resultsData[key].testId]?.title || "Устгагдсан шалгалт",
              }))
              .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())

            // Group results by testId to count attempts
            const resultsByTest = {}
            allUserResults.forEach((result) => {
              if (!resultsByTest[result.testId]) {
                resultsByTest[result.testId] = {
                  attempts: 0,
                  passed: 0,
                  latestResult: null,
                }
              }

              resultsByTest[result.testId].attempts++
              if (result.passed) {
                resultsByTest[result.testId].passed++
              }

              // Keep the latest result for each test
              if (
                !resultsByTest[result.testId].latestResult ||
                new Date(result.completedAt) > new Date(resultsByTest[result.testId].latestResult.completedAt)
              ) {
                resultsByTest[result.testId].latestResult = result
              }
            })

            // Create enhanced results with attempt counts
            const enhancedResults = Object.keys(resultsByTest).map((testId) => {
              const { latestResult, attempts, passed } = resultsByTest[testId]
              return {
                ...latestResult,
                attempts,
                passedCount: passed,
              }
            })

            setResults(enhancedResults)

            // Calculate average score
            if (enhancedResults.length > 0) {
              const totalPercentage = enhancedResults.reduce((sum, result) => sum + result.percentage, 0)
              setAverageScore(Number.parseFloat((totalPercentage / enhancedResults.length).toFixed(2)))
            } else {
              setAverageScore(null)
            }
          } else {
            setResults([])
            setAverageScore(null)
          }
          setLoading(false)
        })

        return () => {
          unsubscribeResults()
        }
      } else {
        // User data not found in database
        signOut(auth).then(() => {
          router.push("/login")
        })
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
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      <SiteHeader>
        <div className="flex items-center gap-4">
          <UserNav user={user} />
        </div>
      </SiteHeader>

      <main className="container mx-auto px-4 py-4 flex-1 pt-16">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="border-cyan-600/40 text-cyan-300 hover:bg-cyan-900/40 hover:text-white rounded-full h-9 w-9"
          >
            <Link href="/dashboard">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h2 className="text-2xl font-bold text-white">Шалгалтын дүн</h2>
        </div>

        {/* Дүнгийн голч харуулах хэсэг */}
        <div className="mb-6">
          <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
            <CardHeader className="pb-3">
              <CardTitle>Дүнгийн голч</CardTitle>
              <CardDescription className="text-cyan-300/80">Таны бүх шалгалтын дүнгийн дундаж</CardDescription>
            </CardHeader>
            <CardContent>
              {averageScore !== null ? (
                <div className="flex items-center gap-4">
                  <div
                    className={`text-3xl font-bold ${
                      averageScore >= 90 ? "text-green-400" : averageScore >= 70 ? "text-blue-400" : "text-red-400"
                    }`}
                  >
                    {averageScore}%
                  </div>
                  <div className="text-sm text-cyan-300/80">{results.length} шалгалтын дундаж</div>
                </div>
              ) : (
                <div className="text-cyan-300/80">Та одоогоор ямар ч шалгалт өгөөгүй байна.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-12 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg shadow-black/10 text-white">
            <p className="text-cyan-300/80">Та одоогоор ямар ч шалгалт өгөөгүй байна.</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard">Шалгалт өгөх</Link>
            </Button>
          </div>
        ) : (
          <div className="bg-card/80 backdrop-blur-sm rounded-lg shadow-lg shadow-black/10 overflow-hidden border border-border/30">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-cyan-300">Шалгалтын нэр</TableHead>
                  <TableHead className="text-cyan-300">Сүүлд өгсөн</TableHead>
                  <TableHead className="text-cyan-300">Оноо</TableHead>
                  <TableHead className="text-cyan-300">Хувь</TableHead>
                  <TableHead className="text-cyan-300">Үр дүн</TableHead>
                  <TableHead className="text-cyan-300">Оролдлого</TableHead>
                  <TableHead className="text-right text-cyan-300">Үйлдэл</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id} className="border-border/30 hover:bg-card/50">
                    <TableCell className="font-medium text-white">{result.testTitle}</TableCell>
                    <TableCell className="text-cyan-300/80">
                      {new Date(result.completedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-cyan-300/80">
                      {result.score}/{result.totalPoints}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-medium ${
                          result.percentage >= 90
                            ? "text-green-400"
                            : result.percentage >= 70
                              ? "text-blue-400"
                              : "text-red-400"
                        }`}
                      >
                        {result.percentage}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.passed ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                        }`}
                      >
                        {result.passed ? "Тэнцсэн" : "Тэнцээгүй"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-cyan-300/80">
                        {result.attempts} удаа ({result.passedCount} тэнцсэн)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="border-cyan-600/40 text-cyan-300 hover:bg-cyan-900/40 hover:text-white"
                      >
                        <Link href={`/test/${result.testId}`}>Дахин өгөх</Link>
                      </Button>
                    </TableCell>
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

