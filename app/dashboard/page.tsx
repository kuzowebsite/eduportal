"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Trophy, BookOpen, Clock, CheckCircle, BarChart, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, onValue } from "firebase/database"
import { UserNav } from "@/components/user-nav"
import { Input } from "@/components/ui/input"
import { Footer } from "@/components/footer"
import { SiteHeader } from "@/components/site-header"
import { Progress } from "@/components/ui/progress"

interface UserData {
  firstName: string
  lastName: string
  email: string
  role?: string
  profileImage?: string
}

interface Test {
  id: string
  title: string
  description: string
  imageUrl?: string
  timeLimit: number
  passingScore: number
}

interface TestResult {
  testId: string
  percentage: number
  passed: boolean
  completedAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [tests, setTests] = useState<Test[]>([])
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState({
    totalTests: 0,
    completedTests: 0,
    passedTests: 0,
    averageScore: 0,
  })

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }

      // Хэрэглэгчийн мэдээллийг авах
      const userRef = ref(database, `users/${currentUser.uid}`)
      const unsubscribeUser = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val()
          setUser(userData)

          // Хэрэв админ бол админ хэсэгрүү чиглүүлэх
          if (userData.role === "admin") {
            console.log("User is admin, redirecting to admin dashboard")
            router.push("/admin/dashboard")
            return
          }
        } else {
          // Хэрэглэгчийн мэдээлэл олдсонгүй
          signOut(auth).then(() => {
            router.push("/login")
          })
        }
      })

      // Шалгалтуудын мэдээллийг авах
      const testsRef = ref(database, "tests")
      const unsubscribeTests = onValue(testsRef, (snapshot) => {
        if (snapshot.exists()) {
          const testsData = snapshot.val()
          const testsArray = Object.keys(testsData).map((key) => ({
            id: key,
            ...testsData[key],
          }))
          setTests(testsArray)
          setStats((prev) => ({ ...prev, totalTests: testsArray.length }))
        } else {
          setTests([])
        }
      })

      // Хэрэглэгчийн шалгалтын дүнг авах
      const resultsRef = ref(database, "results")
      const unsubscribeResults = onValue(resultsRef, (snapshot) => {
        if (snapshot.exists()) {
          const resultsData = snapshot.val()
          const userResults: Record<string, TestResult> = {}
          let totalScore = 0
          let completedCount = 0
          let passedCount = 0

          Object.keys(resultsData).forEach((key) => {
            const result = resultsData[key]
            if (result.userId === currentUser.uid) {
              // Хамгийн сүүлийн дүнг хадгалах
              if (
                !userResults[result.testId] ||
                new Date(result.completedAt) > new Date(userResults[result.testId].completedAt)
              ) {
                userResults[result.testId] = {
                  testId: result.testId,
                  percentage: result.percentage,
                  passed: result.passed,
                  completedAt: result.completedAt,
                }
              }
            }
          })

          // Статистик тооцоолох
          Object.values(userResults).forEach((result) => {
            totalScore += result.percentage
            completedCount++
            if (result.passed) passedCount++
          })

          setResults(userResults)
          setStats({
            totalTests: tests.length,
            completedTests: completedCount,
            passedTests: passedCount,
            averageScore: completedCount > 0 ? Math.round(totalScore / completedCount) : 0,
          })
        }
        setLoading(false)
      })

      return () => {
        unsubscribeUser()
        unsubscribeTests()
        unsubscribeResults()
      }
    })

    return () => {
      unsubscribeAuth()
    }
  }, [router])

  // Шалгалтын хэсгийг жижигсгэж, дизайныг улам сайжруулах
  const filteredTests = tests.filter((test) => {
    if (!searchQuery.trim()) return true
    return test.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-indigo-900">
        <div className="text-center">
          <div className="inline-block animate-spin-slow">
            <BookOpen className="h-12 w-12 text-blue-300" />
          </div>
          <p className="mt-4 text-lg text-blue-200 animate-pulse">Ачааллаж байна...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  // Өнгөний схемийг өөрчлөх
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader className="z-50">
        <div className="flex items-center gap-4">
          <UserNav user={user} />
        </div>
      </SiteHeader>

      <main className="page-container pt-40">
        <div className="max-w-7xl mx-auto">
          {/* Тавтай морил хэсэг */}
          <div className="page-header animate-fade-in">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300">
              Сайн байна уу, {user.firstName}!
            </h1>
            <p className="text-cyan-300 text-lg mt-2">Өнөөдөр юу сурах вэ?</p>
          </div>

          {/* Статистик хэсэг */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/30 p-3 text-center animate-slide-up delay-1 hover:bg-card/90 transition-all duration-300 hover:scale-105 shadow-lg shadow-black/10">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-cyan-900/40 flex items-center justify-center mb-1">
                  <BookOpen className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="text-xl font-bold text-white">{stats.totalTests}</div>
                <div className="text-xs text-cyan-300">Нийт шалгалт</div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/30 p-3 text-center animate-slide-up delay-2 hover:bg-card/90 transition-all duration-300 hover:scale-105 shadow-lg shadow-black/10">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-900/40 flex items-center justify-center mb-1">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="text-xl font-bold text-white">{stats.completedTests}</div>
                <div className="text-xs text-cyan-300">Өгсөн шалгалт</div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/30 p-3 text-center animate-slide-up delay-3 hover:bg-card/90 transition-all duration-300 hover:scale-105 shadow-lg shadow-black/10">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-purple-900/40 flex items-center justify-center mb-1">
                  <Trophy className="h-5 w-5 text-purple-400" />
                </div>
                <div className="text-xl font-bold text-white">{stats.passedTests}</div>
                <div className="text-xs text-cyan-300">Тэнцсэн</div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/30 p-3 text-center animate-slide-up delay-4 hover:bg-card/90 transition-all duration-300 hover:scale-105 shadow-lg shadow-black/10">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-amber-900/40 flex items-center justify-center mb-1">
                  <BarChart className="h-5 w-5 text-amber-400" />
                </div>
                <div className="text-xl font-bold text-white">{stats.averageScore}%</div>
                <div className="text-xs text-cyan-300">Дундаж оноо</div>
              </div>
            </div>
          </div>

          {/* Үйлдлийн хэсэг */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="relative flex-1 max-w-md animate-slide-left">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cyan-400" />
                <Input
                  placeholder="Шалгалтын нэрээр хайх..."
                  className="pl-10 bg-card/50 border-border/30 text-white placeholder:text-cyan-400/70 focus:border-cyan-500 focus:ring-cyan-500 rounded-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Шалгалтын хэсэг */}
          {filteredTests.length === 0 ? (
            <div className="text-center py-16 bg-card/80 backdrop-blur-sm rounded-lg border border-border/30 shadow-lg shadow-black/10 animate-fade-in">
              {searchQuery.trim() ? (
                <div>
                  <Search className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                  <p className="text-cyan-300">"{searchQuery}" гэсэн хайлтад тохирох шалгалт олдсонгүй.</p>
                </div>
              ) : (
                <div>
                  <BookOpen className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                  <p className="text-cyan-300">Одоогоор шалгалт байхгүй байна.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredTests.map((test, index) => {
                const result = results[test.id]
                const hasCompleted = !!result

                return (
                  <div
                    key={test.id}
                    className="group bg-card/80 backdrop-blur-sm rounded-lg border border-border/30 overflow-hidden hover:bg-card/90 transition-all duration-500 hover:scale-105 shadow-lg shadow-black/10 hover:shadow-black/30 animate-slide-up flex flex-col"
                    style={{ animationDelay: `${0.05 * (index % 8)}s` }}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={test.imageUrl || "/placeholder.svg?height=120&width=200"}
                        alt={test.title}
                        className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=120&width=200"
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent flex flex-col justify-end p-3">
                        <h3 className="font-bold text-white text-sm line-clamp-1">{test.title}</h3>
                        {hasCompleted && (
                          <div className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mb-1 bg-gradient-to-r from-cyan-600/80 to-cyan-500/80 text-white shadow-sm">
                            {result.passed ? (
                              <>
                                <CheckCircle className="h-2.5 w-2.5 mr-1" /> Тэнцсэн
                              </>
                            ) : (
                              <span>Тэнцээгүй</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="text-xs text-cyan-300 line-clamp-2 mb-2 flex-1">{test.description}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-card/50 text-cyan-300">
                          <Clock className="h-2.5 w-2.5 mr-0.5" /> {test.timeLimit || "30:00"}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-card/50 text-purple-300">
                          <BarChart className="h-2.5 w-2.5 mr-0.5" /> {test.passingScore}%
                        </span>
                      </div>

                      {hasCompleted && (
                        <div className="mb-2">
                          <div className="flex justify-between text-[10px] text-cyan-400 mb-1">
                            <span>Оноо</span>
                            <span>{result.percentage}%</span>
                          </div>
                          <Progress
                            value={result.percentage}
                            className="h-1.5 bg-card/40"
                            style={
                              {
                                "--progress-background": result.passed
                                  ? "rgba(52, 211, 153, 0.7)"
                                  : "rgba(239, 68, 68, 0.7)",
                              } as React.CSSProperties
                            }
                          />
                        </div>
                      )}

                      <Button
                        asChild
                        className="w-full mt-auto bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-md shadow-md shadow-black/20 hover:shadow-black/40 transition-all duration-300 group-hover:scale-105 flex items-center justify-center h-8 text-xs"
                      >
                        <Link href={`/test/${test.id}`}>
                          {hasCompleted ? "Дахин өгөх" : "Шалгалт өгөх"}
                          <ArrowRight className="ml-1 h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

