"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Clock, AlertTriangle, BookOpen, Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, get, push, set } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { UserNav } from "@/components/user-nav"
import { SiteHeader } from "@/components/site-header"

interface User {
  firstName: string
  lastName: string
  email: string
  id: string
}

interface Option {
  id: string
  text: string
  imageUrl?: string
}

interface Question {
  id: string
  text: string
  type: "single" | "multiple" | "text" | "matching"
  options: Option[]
  correctAnswers: string[]
  points: number
  imageUrl?: string
  linkedQuestionId?: string
  linkedAnswerIds?: string[]
  matchingPairs?: { left: string; right: string; points?: number }[]
}

interface UserAnswer {
  questionId: string
  answer: string[] | string
  matchingAnswers?: { leftId: string; rightId: string; points?: number }[]
}

interface Test {
  title: string
  description: string
  timeLimit: string
  passingScore: number
  shuffleQuestions: boolean
  questions: Question[]
  imageUrl?: string
}

export default function TestPage() {
  const router = useRouter()
  const params = useParams()
  const testId = params.id as string
  const { toast } = useToast()

  const [user, setUser] = useState<User | null>(null)
  const [test, setTest] = useState<Test | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [testStarted, setTestStarted] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)
  const [testResult, setTestResult] = useState<{
    score: number
    totalPoints: number
    percentage: number
    passed: boolean
  } | null>(null)

  // Холбоотой асуултуудыг харуулах эсэхийг хянах
  const [visibleQuestions, setVisibleQuestions] = useState<string[]>([])

  // Харгалзуулах асуултын үр дүнг хадгалах
  const [matchingResults, setMatchingResults] = useState<{
    [questionId: string]: {
      correctCount: number
      totalPairs: number
      earnedPoints: number
      totalPairPoints: number
      questionText: string
    }
  }>({})

  // Шалгалтын мэдээлэл болон хэрэглэгчийн мэдээллийг ачаалах
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }

      try {
        // Хэрэглэгчийн мэдээллийг авах
        const userRef = ref(database, `users/${currentUser.uid}`)
        const userSnapshot = await get(userRef)

        if (userSnapshot.exists()) {
          const userData = userSnapshot.val()
          setUser({
            ...userData,
            id: currentUser.uid,
          })

          // Хэрэв админ бол админ хэсэгрүү чиглүүлэх
          if (userData.role === "admin") {
            router.push("/admin/dashboard")
            return
          }

          // Шалгалтын мэдээллийг авах
          const testRef = ref(database, `tests/${testId}`)
          const testSnapshot = await get(testRef)

          if (testSnapshot.exists()) {
            const testData = testSnapshot.val() as Test

            // Хэрэглэгч энэ шалгалтыг өмнө нь өгсөн эсэхийг шалгах
            const resultsRef = ref(database, `results`)
            const resultsSnapshot = await get(resultsRef)

            if (resultsSnapshot.exists()) {
              const results = resultsSnapshot.val()
              const userResults = Object.values(results).filter(
                (result: any) => result.userId === currentUser.uid && result.testId === testId,
              )

              if (userResults.length > 0) {
                // Хэрэглэгч энэ шалгалтыг өмнө нь өгсөн байна, гэхдээ дахин өгөх боломжтой
                // Хамгийн сүүлийн үр дүнг харуулах
                const latestResult = userResults.sort(
                  (a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
                )[0]

                setTestResult({
                  score: latestResult.score,
                  totalPoints: latestResult.totalPoints,
                  percentage: latestResult.percentage,
                  passed: latestResult.passed,
                })
              }
            }

            // Асуултуудыг боловсруулах
            let questions = testData.questions || []

            // Хэрэглэгчийн хариултуудыг эхлүүлэх
            if (questions && !testCompleted) {
              const initialAnswers = questions.map((q) => {
                if (q.type === "matching") {
                  return {
                    questionId: q.id,
                    answer: "",
                    matchingAnswers: [], // Харгалзуулах асуултуудад хоосон массив
                  }
                } else {
                  return {
                    questionId: q.id,
                    answer: q.type === "multiple" ? [] : "",
                  }
                }
              })
              setUserAnswers(initialAnswers)

              // Харагдах асуултуудыг эхлүүлэх (холбоогүй бүх асуултууд харагдана)
              const initialVisibleQuestions = questions
                .filter((q) => !questions.some((otherQ) => otherQ.linkedQuestionId === q.id))
                .map((q) => q.id)

              setVisibleQuestions(initialVisibleQuestions)
            }

            // Шалгалтын асуултуудыг холих
            if (testData.shuffleQuestions && questions) {
              questions = [...questions].sort(() => Math.random() - 0.5)
            }

            setTest({
              ...testData,
              questions: questions || [],
            })

            // Хугацааг тохируулах - mm:ss форматаас секунд руу хөрвүүлэх
            if (testData.timeLimit) {
              const timeParts = testData.timeLimit.split(":")
              const minutes = Number.parseInt(timeParts[0], 10) || 0
              const seconds = Number.parseInt(timeParts[1], 10) || 0
              const totalSeconds = minutes * 60 + seconds
              setTimeLeft(totalSeconds)
            }
          } else {
            toast({
              title: "Алдаа",
              description: "Шалгалт олдсонгүй",
              variant: "destructive",
            })
            router.push("/dashboard")
          }
        } else {
          // Хэрэглэгчийн мэдээлэл олдсонгүй
          signOut(auth).then(() => {
            router.push("/login")
          })
        }
      } catch (error) {
        console.error("Error loading test data:", error)
        toast({
          title: "Алдаа",
          description: "Мэдээлэл ачааллахад алдаа гарлаа",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    })

    return () => {
      unsubscribeAuth()
    }
  }, [router, testId, toast])

  // Цаг хэмжигч
  useEffect(() => {
    if (!testStarted || testCompleted || !test) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmitTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [testStarted, testCompleted, test])

  // Хариултууд өөрчлөгдөхөд харагдах асуултуудыг шинэчлэх
  useEffect(() => {
    if (!test || !testStarted || !test.questions) return

    // Холбоогүй бүх асуултуудаар эхлэх
    const baseVisibleQuestions = test.questions
      .filter((q) => !test.questions.some((otherQ) => otherQ.linkedQuestionId === q.id))
      .map((q) => q.id)

    // Хариултаас хамаарч харагдах холбоотой асуултуудыг нэмэх
    const linkedVisibleQuestions = test.questions
      .filter((q) => q.linkedQuestionId && q.linkedAnswerIds)
      .flatMap((q) => {
        const userAnswer = userAnswers.find((a) => a.questionId === q.id)
        if (!userAnswer) return []

        // Сонгосон хариултууд холбоотой асуултыг харуулах ёстой эсэхийг шалгах
        const selectedAnswers = Array.isArray(userAnswer.answer) ? userAnswer.answer : [userAnswer.answer]

        const shouldShowLinked = selectedAnswers.some((answer) => answer && q.linkedAnswerIds?.includes(answer))

        return shouldShowLinked ? [q.linkedQuestionId] : []
      })

    setVisibleQuestions([...baseVisibleQuestions, ...linkedVisibleQuestions])
  }, [test, userAnswers, testStarted])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`
  }

  const handleSingleAnswer = (questionId: string, optionId: string) => {
    setUserAnswers((prev) => prev.map((a) => (a.questionId === questionId ? { ...a, answer: optionId } : a)))
  }

  const handleMultipleAnswer = (questionId: string, optionId: string, checked: boolean) => {
    setUserAnswers((prev) =>
      prev.map((a) => {
        if (a.questionId === questionId) {
          const currentAnswers = Array.isArray(a.answer) ? a.answer : []
          const newAnswers = checked ? [...currentAnswers, optionId] : currentAnswers.filter((id) => id !== optionId)
          return { ...a, answer: newAnswers }
        }
        return a
      }),
    )
  }

  const handleTextAnswer = (questionId: string, text: string) => {
    setUserAnswers((prev) => prev.map((a) => (a.questionId === questionId ? { ...a, answer: text } : a)))
  }

  // Харгалзуулах асуултын хариулт боловсруулах функц
  const handleMatchingAnswer = (questionId: string, leftId: string, rightId: string) => {
    setUserAnswers((prev) => {
      const userAnswer = prev.find((a) => a.questionId === questionId)
      if (!userAnswer) return prev

      // Зөв хариултын хос олох
      const question = test?.questions.find((q) => q.id === questionId)
      const matchingPair = question?.matchingPairs?.find((p) => p.left === leftId && p.right === rightId)
      const pairPoints = matchingPair?.points || 1

      const matchingAnswers = userAnswer.matchingAnswers || []
      const existingPairIndex = matchingAnswers.findIndex((pair) => pair.leftId === leftId)

      let newMatchingAnswers
      if (existingPairIndex >= 0) {
        // Байгаа хосыг шинэчлэх
        newMatchingAnswers = [...matchingAnswers]
        newMatchingAnswers[existingPairIndex] = { leftId, rightId, points: pairPoints }
      } else {
        // Шинэ хос нэмэх
        newMatchingAnswers = [...matchingAnswers, { leftId, rightId, points: pairPoints }]
      }

      return prev.map((a) => (a.questionId === questionId ? { ...a, matchingAnswers: newMatchingAnswers } : a))
    })
  }

  const getVisibleQuestions = () => {
    if (!test || !test.questions) return []

    return test.questions.filter((q) => visibleQuestions.includes(q.id))
  }

  const goToNextQuestion = () => {
    const visibleQs = getVisibleQuestions()

    if (currentQuestionIndex < visibleQs.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const calculateScore = () => {
    if (!test || !user || !test.questions) return null

    let score = 0
    let totalPoints = 0
    const newMatchingResults: {
      [questionId: string]: {
        correctCount: number
        totalPairs: number
        earnedPoints: number
        totalPairPoints: number
        questionText: string
      }
    } = {}

    // Зөвхөн харагдаж буй асуултуудыг оноожуулах
    const visibleQs = getVisibleQuestions()

    visibleQs.forEach((question) => {
      totalPoints += question.points

      const userAnswer = userAnswers.find((a) => a.questionId === question.id)
      if (!userAnswer) return

      if (question.type === "single") {
        if (question.correctAnswers.includes(userAnswer.answer as string)) {
          score += question.points
        }
      } else if (question.type === "multiple") {
        const userSelectedOptions = userAnswer.answer as string[]

        // Хэрэглэгч бүх зөв хариултыг сонгосон эсэх, буруу хариулт сонгоогүй эсэхийг шалгах
        const allCorrectSelected = question.correctAnswers.every((id) => userSelectedOptions.includes(id))

        const noIncorrectSelected = userSelectedOptions.every((id) => question.correctAnswers.includes(id))

        if (allCorrectSelected && noIncorrectSelected) {
          score += question.points
        }
      } else if (question.type === "text") {
        // Текст асуултуудад гараар оноожуулах шаардлагатай
        // Одоогоор зөвхөн хариултыг хадгалах
      } else if (question.type === "matching" && userAnswer.matchingAnswers) {
        // Харгалзуулах асуултын хариултыг шалгах
        const correctPairs = question.matchingPairs || []
        const userPairs = userAnswer.matchingAnswers

        // Зөв хариултын тоог тооцох
        let correctCount = 0
        let earnedPoints = 0
        let totalPairPoints = 0

        // Нийт боломжит оноог тооцох
        correctPairs.forEach((pair) => {
          totalPairPoints += pair.points || 1
        })

        // Зөв хариултын оноог тооцох
        for (const userPair of userPairs) {
          const correctPair = correctPairs.find(
            (pair) => pair.left === userPair.leftId && pair.right === userPair.rightId,
          )
          if (correctPair) {
            correctCount++
            earnedPoints += correctPair.points || 1
          }
        }

        // Бүх хосыг зөв харгалзуулсан бол бүх оноог өгөх (100%)
        if (correctCount === correctPairs.length && correctPairs.length > 0) {
          score += question.points // Асуултын бүх оноог өгөх
          earnedPoints = question.points // Дэлгэрэнгүй мэдээлэлд зөв харуулахын тулд
        } else {
          // Хэсэгчилсэн оноо өгөх
          const partialScore = (earnedPoints / totalPairPoints) * question.points
          score += partialScore
          earnedPoints = partialScore
        }

        // Хариултын дэлгэрэнгүй мэдээллийг хадгалах
        newMatchingResults[question.id] = {
          correctCount,
          totalPairs: correctPairs.length,
          earnedPoints,
          totalPairPoints: question.points, // Асуултын нийт оноог харуулах
          questionText: question.text,
        }
      }
    })

    setMatchingResults(newMatchingResults)

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
    const passed = percentage >= test.passingScore

    return {
      score,
      totalPoints,
      percentage,
      passed,
    }
  }

  const handleSubmitTest = async () => {
    if (!test || !user) return

    try {
      setSubmitting(true)

      const result = calculateScore()
      if (!result) return

      // Зарцуулсан хугацааг тооцоолох
      let timeSpent = 0
      if (test.timeLimit) {
        // Хугацааны хязгаарыг mm:ss форматаас секунд руу хөрвүүлэх
        const timeParts = test.timeLimit.split(":")
        const minutes = Number.parseInt(timeParts[0], 10) || 0
        const seconds = Number.parseInt(timeParts[1], 10) || 0
        const totalSeconds = minutes * 60 + seconds

        // Зарцуулсан хугацааг тооцоолох
        timeSpent = totalSeconds - timeLeft
      }

      // Үр дүнг мэдээллийн санд хадгалах
      const resultRef = push(ref(database, "results"))

      // Тодорхойгүй matchingAnswers-ийг цэвэрлэх
      const cleanedUserAnswers = userAnswers.map((answer) => {
        // Хэрэв matchingAnswers тодорхойгүй бол түүнийг оруулахгүйгээр хариултыг буцаах
        if (answer.matchingAnswers === undefined) {
          const { matchingAnswers, ...rest } = answer
          return rest
        }
        // Эсрэг тохиолдолд анхны хариултыг буцаах
        return answer
      })

      await set(resultRef, {
        testId,
        userId: user.id,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        answers: cleanedUserAnswers,
        visibleQuestions: visibleQuestions,
        score: result.score,
        totalPoints: result.totalPoints,
        percentage: result.percentage,
        passed: result.passed,
        timeSpent: timeSpent,
        completedAt: new Date().toISOString(),
      })

      setTestCompleted(true)
      setTestResult(result)

      toast({
        title: "Шалгалт дууслаа",
        description: "Таны хариултууд амжилттай хадгалагдлаа.",
      })
    } catch (error: any) {
      console.error("Error submitting test:", error)
      toast({
        title: "Алдаа гарлаа",
        description: "Шалгалтын хариултыг хадгалахад алдаа гарлаа: " + error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const startTest = () => {
    setTestStarted(true)
  }

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

  if (!user || !test) {
    return (
      <div className="container mx-auto p-8 text-center text-white">
        <p>Шалгалт олдсонгүй.</p>
        <Button asChild variant="back" className="mt-4 mx-auto">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    )
  }

  const visibleQs = getVisibleQuestions()
  const currentQuestion = visibleQs[currentQuestionIndex]
  const userAnswer = userAnswers.find((a) => a.questionId === currentQuestion?.id)
  const progress = visibleQs.length > 0 ? ((currentQuestionIndex + 1) / visibleQs.length) * 100 : 0

  // Шалгалтын хуудасны дизайныг сайжруулах
  // Өнгөний схемийг өөрчлөх
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader>
        <div className="flex items-center gap-4">
          <UserNav user={user} />
        </div>
      </SiteHeader>

      <main className="page-container pt-40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6 animate-fade-in">
            <Button variant="back" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300">
              {test.title}
            </h2>
          </div>

          {!testStarted && !testCompleted ? (
            <Card className="max-w-3xl mx-auto animate-slide-up bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
              <CardHeader className="bg-gradient-to-r from-cyan-700/70 to-cyan-600/70 rounded-t-lg">
                <CardTitle className="text-white">{test.title}</CardTitle>
                <CardDescription className="text-cyan-200">{test.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {test.imageUrl && (
                  <div className="relative group overflow-hidden rounded-lg">
                    <img
                      src={test.imageUrl || "/placeholder.svg?height=50&width=50"}
                      alt={test.title}
                      className="max-h-60 object-contain mx-auto rounded-md shadow-md transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        console.error("Error loading image:", test.imageUrl)
                        e.currentTarget.src = "/placeholder.svg?height=50&width=50"
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-card/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-cyan-900/30 rounded-lg hover:bg-cyan-900/50 transition-colors duration-300 hover:scale-105 transform">
                    <div className="w-10 h-10 rounded-full bg-cyan-900/40 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-cyan-300 text-sm">Хугацаа</p>
                      <p className="text-lg text-white font-medium">{test.timeLimit}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-purple-900/30 rounded-lg hover:bg-purple-900/50 transition-colors duration-300 hover:scale-105 transform">
                    <div className="w-10 h-10 rounded-full bg-purple-900/40 flex items-center justify-center">
                      <Check className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-purple-300 text-sm">Тэнцэх оноо</p>
                      <p className="text-lg text-white font-medium">{test.passingScore}%</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-amber-900/20 rounded-lg border border-amber-700/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-900/40 flex items-center justify-center mt-1">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-300 mb-2">Анхааруулга:</p>
                      <ul className="text-sm text-cyan-300 space-y-2">
                        <li className="animate-slide-left delay-1">Шалгалт эхэлсний дараа хугацаа тоолж эхлэх болно</li>
                        <li className="animate-slide-left delay-2">
                          Шалгалтын хугацаа дуусахад автоматаар хадгалагдана
                        </li>
                        <li className="animate-slide-left delay-3">Шалгалтыг нэг л удаа өгөх боломжтой</li>
                        <li className="animate-slide-left delay-4">Нийт {test.questions?.length || 0} асуулт байгаа</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={startTest}
                  className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-lg shadow-md shadow-black/20 hover:shadow-black/30 transition-all duration-300 hover:scale-105 group"
                >
                  Шалгалт эхлүүлэх
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </CardFooter>
            </Card>
          ) : testCompleted ? (
            <Card className="max-w-3xl mx-auto animate-fade-in bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
              <CardHeader
                className={
                  testResult?.passed
                    ? "bg-gradient-to-r from-green-700/70 to-green-600/70 rounded-t-lg"
                    : "bg-gradient-to-r from-red-700/70 to-red-600/70 rounded-t-lg"
                }
              >
                <CardTitle>Шалгалтын дүн</CardTitle>
                <CardDescription className="text-white/80">
                  {test.title} - {new Date().toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 p-6">
                <div className="flex justify-center animate-slide-up">
                  <div
                    className="result-circle"
                    style={
                      {
                        "--percentage": `${testResult?.percentage}%`,
                        "--circle-color": testResult?.passed ? "rgba(52, 211, 153, 0.8)" : "rgba(239, 68, 68, 0.8)",
                      } as React.CSSProperties
                    }
                  >
                    <div className="result-circle-content">
                      <p className="result-percentage" style={{ color: testResult?.passed ? "#34d399" : "#ef4444" }}>
                        {testResult?.percentage}%
                      </p>
                      <p className="result-score text-white">
                        {(Math.round(testResult?.score * 10) / 10).toFixed(1)}/{testResult?.totalPoints}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center animate-slide-up delay-2">
                  <p className={`text-xl font-bold mb-2 ${testResult?.passed ? "text-green-400" : "text-red-400"}`}>
                    {testResult?.passed
                      ? "Баяр хүргэе! Та шалгалтад тэнцлээ."
                      : "Уучлаарай, та шалгалтад тэнцээгүй байна."}
                  </p>
                  <p className="text-cyan-300">Тэнцэх оноо: {test.passingScore}%</p>
                </div>

                {/* Харгалзуулах асуултын дэлгэрэнгүй дүн */}
                {Object.keys(matchingResults).length > 0 && (
                  <div className="mt-6 border border-border/30 rounded-lg p-5 bg-card/20 animate-slide-up delay-3">
                    <h3 className="font-medium text-lg mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300">
                      Харгалзуулах асуултын дүн:
                    </h3>
                    <div className="space-y-5">
                      {Object.entries(matchingResults).map(([questionId, result], index) => (
                        <div
                          key={questionId}
                          className="border-b border-border/30 pb-4 animate-slide-up"
                          style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                        >
                          <p className="font-medium mb-3 text-white">{result.questionText}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-cyan-900/20 p-3 rounded-lg">
                              <p className="text-cyan-300 text-sm">Зөв харгалзуулсан:</p>
                              <p className="text-white">
                                {result.correctCount}/{result.totalPairs} хос
                                {result.totalPairs > 0 && (
                                  <span className="ml-1 text-sm text-cyan-300">
                                    ({Math.round((result.correctCount / result.totalPairs) * 100)}%)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="bg-purple-900/20 p-3 rounded-lg">
                              <p className="text-purple-300 text-sm">Авсан оноо:</p>
                              <p className="text-white">
                                {(Math.round(result.earnedPoints * 10) / 10).toFixed(1)}/{result.totalPairPoints}
                                {result.totalPairPoints > 0 && (
                                  <span className="ml-1 text-sm text-purple-300">
                                    ({Math.round((result.earnedPoints / result.totalPairPoints) * 100)}%)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {result.correctCount === result.totalPairs && result.totalPairs > 0 && (
                            <div className="mt-3 bg-green-900/20 border border-green-700/30 p-3 rounded-lg text-green-300 text-sm flex items-center">
                              <Check className="h-4 w-4 mr-2" />
                              Бүх хосыг зөв харгалзуулсан тул бүрэн оноо авлаа! (100%)
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-4 pt-4 animate-slide-up delay-5">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTestCompleted(false)
                      setTestStarted(false)
                      setCurrentQuestionIndex(0)
                      setMatchingResults({}) // Харгалзуулах үр дүнг шинэчлэх
                      setTimeLeft(() => {
                        // Хугацааг шинэчлэх
                        if (!test.timeLimit) return 0
                        const timeParts = test.timeLimit.split(":")
                        const minutes = Number.parseInt(timeParts[0], 10) || 0
                        const seconds = Number.parseInt(timeParts[1], 10) || 0
                        return minutes * 60 + seconds
                      })
                      // Хэрэглэгчийн хариултуудыг шинэчлэх
                      if (test.questions) {
                        const initialAnswers = test.questions.map((q) => {
                          if (q.type === "matching") {
                            return {
                              questionId: q.id,
                              answer: "",
                              matchingAnswers: [], // Харгалзуулах асуултуудад хоосон массив
                            }
                          } else {
                            return {
                              questionId: q.id,
                              answer: q.type === "multiple" ? [] : "",
                            }
                          }
                        })
                        setUserAnswers(initialAnswers)
                      }
                    }}
                    className="border-cyan-600/40 text-cyan-300 hover:bg-cyan-900/40 hover:text-white shadow-md shadow-black/10 hover:shadow-black/20 hover:scale-105"
                  >
                    Дахин өгөх
                  </Button>
                  <Link href="/results" className="text-cyan-300 hover:text-white transition-colors">
                    Бүх шалгалтын дүн харах
                  </Link>
                </div>
              </CardContent>
              <CardFooter className="text-center"></CardFooter>
            </Card>
          ) : (
            <Card className="max-w-3xl mx-auto animate-fade-in bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold">
                  {test.title} - {currentQuestionIndex + 1}/{visibleQs.length}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-cyan-300" />
                  <span className="text-white">{formatTime(timeLeft)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full bg-cyan-900/20 rounded-full h-2 mb-4">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                {currentQuestion && (
                  <div key={currentQuestion.id} className="space-y-4">
                    <p className="text-lg font-semibold text-cyan-200">{currentQuestion.text}</p>
                    {currentQuestion.imageUrl && (
                      <div className="relative group overflow-hidden rounded-lg">
                        <img
                          src={currentQuestion.imageUrl || "/placeholder.svg?height=50&width=50"}
                          alt={currentQuestion.text}
                          className="max-h-60 object-contain mx-auto rounded-md shadow-md transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => {
                            console.error("Error loading image:", currentQuestion.imageUrl)
                            e.currentTarget.src = "/placeholder.svg?height=50&width=50"
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-card/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    )}

                    {currentQuestion.type === "single" &&
                      currentQuestion.options &&
                      currentQuestion.options.map((option) => (
                        <Button
                          key={option.id}
                          variant="outline"
                          className={`w-full justify-start rounded-lg border-border/40 hover:bg-cyan-900/40 hover:text-white shadow-md shadow-black/10 hover:shadow-black/20 ${
                            userAnswer?.answer === option.id ? "bg-cyan-900/50 text-white" : "text-cyan-300"
                          }`}
                          onClick={() => handleSingleAnswer(currentQuestion.id, option.id)}
                        >
                          {option.text}
                        </Button>
                      ))}

                    {currentQuestion.type === "multiple" &&
                      currentQuestion.options &&
                      currentQuestion.options.map((option) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`option-${option.id}`}
                            className="h-5 w-5 rounded accent-cyan-500 focus:ring-0 focus:ring-offset-0"
                            checked={Array.isArray(userAnswer?.answer) ? userAnswer?.answer.includes(option.id) : false}
                            onChange={(e) => handleMultipleAnswer(currentQuestion.id, option.id, e.target.checked)}
                          />
                          <label
                            htmlFor={`option-${option.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-cyan-300"
                          >
                            {option.text}
                          </label>
                        </div>
                      ))}

                    {currentQuestion.type === "text" && (
                      <div className="relative">
                        <textarea
                          placeholder="Хариултаа энд бичнэ үү..."
                          className="peer block min-h-[auto] w-full rounded border border-border/40 bg-background px-3 py-[0.32rem] leading-[1.6] outline-none transition-all duration-200 ease-linear focus:placeholder:opacity-100 data-[te-input-state-active]:placeholder:opacity-100 motion-reduce:transition-none dark:text-neutral-200 disabled:cursor-not-allowed focus:text-primary"
                          value={userAnswer?.answer as string}
                          onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
                        />
                      </div>
                    )}

                    {currentQuestion.type === "matching" && currentQuestion.matchingPairs && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-cyan-300 mb-2">Зүүн тал:</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-cyan-300 mb-2">Баруун тал:</p>
                        </div>

                        {currentQuestion.matchingPairs.map((pair) => (
                          <React.Fragment key={pair.left}>
                            <div className="flex items-center">
                              <p className="text-white">{pair.left}</p>
                            </div>
                            <div className="mb-3">
                              <select
                                className="w-full rounded border border-border/40 bg-background text-white p-2"
                                value={userAnswer?.matchingAnswers?.find((a) => a.leftId === pair.left)?.rightId || ""}
                                onChange={(e) => handleMatchingAnswer(currentQuestion.id, pair.left, e.target.value)}
                              >
                                <option value="">- Сонгох -</option>
                                {currentQuestion.matchingPairs &&
                                  currentQuestion.matchingPairs.map((rightPair) => (
                                    <option key={rightPair.right} value={rightPair.right}>
                                      {rightPair.right}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <Button
                  variant="secondary"
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white rounded-lg shadow-md shadow-black/20 hover:shadow-black/30 transition-all duration-300 hover:scale-105 group"
                >
                  <ArrowLeft className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                  Өмнөх
                </Button>
                <Button
                  onClick={currentQuestionIndex === visibleQs.length - 1 ? handleSubmitTest : goToNextQuestion}
                  className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-lg shadow-md shadow-black/20 hover:shadow-black/30 transition-all duration-300 hover:scale-105 group"
                >
                  {currentQuestionIndex === visibleQs.length - 1 ? (
                    <>
                      Дуусгах
                      <Check className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Дараах
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

