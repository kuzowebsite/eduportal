"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Save, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, onValue, push, set } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminHeader } from "@/components/admin-header"
import { UserNav } from "@/components/user-nav"

interface User {
  firstName: string
  lastName: string
  email: string
  role: string
}

interface Option {
  id: string
  text: string
  imageUrl?: string
}

// Харгалзуулах асуултын интерфейсийг өөрчлөх - matchingPairs дотор points нэмэх
interface Question {
  id: string
  text: string
  type: "single" | "multiple" | "text" | "matching"
  options: Option[]
  correctAnswers: string[]
  points: number
  imageUrl?: string
  linkedQuestionId?: string
  linkedAnswerIds?: string[] // Which answers trigger the linked question
  matchingPairs?: { left: string; right: string; points?: number }[] // Харгалзуулах хосууд, оноотой
}

export default function NewTestPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Хугацааны хязгаар оруулах хэсгийг өөрчлөх
  const [testData, setTestData] = useState({
    title: "",
    description: "",
    timeLimit: "30:00", // минут:секунд форматтай болгох
    passingScore: 70, // percentage
    shuffleQuestions: false,
  })

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: "",
    text: "",
    type: "single",
    options: [],
    correctAnswers: [],
    points: 1,
  })
  const [newOption, setNewOption] = useState("")
  const [errors, setErrors] = useState({
    title: "",
    description: "",
    questions: "",
    currentQuestion: "",
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null)
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null)

  const [optionImageFile, setOptionImageFile] = useState<File | null>(null)
  const [optionImagePreview, setOptionImagePreview] = useState<string | null>(null)
  const [currentOptionId, setCurrentOptionId] = useState<string | null>(null)

  // pairPoints state нэмэх
  const [pairPoints, setPairPoints] = useState<number>(1)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }

      // Get user data from database
      const userRef = ref(database, `users/${currentUser.uid}`)
      const unsubscribe = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val()
          setUser(userData)

          // Check if user is admin
          if (userData.role !== "admin") {
            router.push("/dashboard")
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
        unsubscribe()
      }
    })

    return () => {
      unsubscribeAuth()
    }
  }, [router])

  const handleLogout = () => {
    signOut(auth).then(() => {
      router.push("/login")
    })
  }

  const handleTestDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setTestData((prev) => ({ ...prev, [name]: value }))

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSwitchChange = (checked: boolean) => {
    setTestData((prev) => ({ ...prev, shuffleQuestions: checked }))
  }

  // Хугацааны хязгаар оруулах хэсгийг өөрчлөх
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setTestData((prev) => ({ ...prev, timeLimit: value }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, name: string) => {
    const { value } = e.target
    const parsedValue = Number.parseInt(value)

    if (!isNaN(parsedValue)) {
      setTestData((prev) => ({ ...prev, [name]: parsedValue }))
    }
  }

  // Зураг хадгалах функцийг өөрчлөх - Firebase Storage ашиглахгүй
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Алдаа",
          description: "Зөвхөн зураг оруулна уу",
          variant: "destructive",
        })
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Алдаа",
          description: "Зургийн хэмжээ 2MB-ээс хэтрэхгүй байх ёстой",
          variant: "destructive",
        })
        return
      }

      setImageFile(file)

      // Create preview and convert to base64 for database storage
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target) {
          const base64String = event.target.result as string
          setImagePreview(base64String)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Асуултын зураг хадгалах функцийг өөрчлөх
  const handleQuestionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Алдаа",
          description: "Зөвхөн зураг оруулна уу",
          variant: "destructive",
        })
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Алдаа",
          description: "Зургийн хэмжээ 2MB-ээс хэтрэхгүй байх ёстой",
          variant: "destructive",
        })
        return
      }

      setQuestionImageFile(file)

      // Create preview and convert to base64 for database storage
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target) {
          const base64String = event.target.result as string
          setQuestionImagePreview(base64String)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Сонголтын зураг хадгалах функцийг өөрчлөх
  const handleOptionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Алдаа",
          description: "Зөвхөн зураг оруулна уу",
          variant: "destructive",
        })
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Алдаа",
          description: "Зургийн хэмжээ 2MB-ээс хэтрэхгүй байх ёстой",
          variant: "destructive",
        })
        return
      }

      setOptionImageFile(file)
      setCurrentOptionId(newOption)

      // Create preview and convert to base64 for database storage
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target) {
          const base64String = event.target.result as string
          setOptionImagePreview(base64String)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCurrentQuestion((prev) => ({ ...prev, [name]: value }))
  }

  // handleQuestionTypeChange функцийг өөрчлөх
  const handleQuestionTypeChange = (value: string) => {
    if (value === "single" || value === "multiple" || value === "text" || value === "matching") {
      setCurrentQuestion((prev) => ({
        ...prev,
        type: value,
        options: value === "text" ? [] : prev.options,
        correctAnswers: [],
        matchingPairs: value === "matching" ? [] : undefined,
      }))
    }
  }

  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value)
    if (!isNaN(value) && value > 0) {
      setCurrentQuestion((prev) => ({ ...prev, points: value }))
    }
  }

  const handleLinkedQuestionChange = (questionId: string | undefined) => {
    setCurrentQuestion((prev) => ({
      ...prev,
      linkedQuestionId: questionId,
    }))
  }

  const handleLinkedAnswerChange = (optionId: string, checked: boolean) => {
    setCurrentQuestion((prev) => {
      const currentLinkedAnswers = prev.linkedAnswerIds || []

      if (checked) {
        return {
          ...prev,
          linkedAnswerIds: [...currentLinkedAnswers, optionId],
        }
      } else {
        return {
          ...prev,
          linkedAnswerIds: currentLinkedAnswers.filter((id) => id !== optionId),
        }
      }
    })
  }

  // Сонголт нэмэх функцийг өөрчлөх
  const addOption = async () => {
    if (!newOption.trim()) return

    try {
      const newOptionId = `option-${Date.now()}`
      const newOptionObj: Option = { id: newOptionId, text: newOption.trim() }

      // If there's an option image, add it directly as base64
      if (optionImageFile) {
        try {
          // Use the preview as the image data (already in base64)
          if (optionImagePreview) {
            newOptionObj.imageUrl = optionImagePreview
          }
        } catch (error) {
          console.error("Error adding option image:", error)
          toast({
            title: "Алдаа",
            description:
              "Сонголтын зураг оруулахад алдаа гарлаа: " + (error instanceof Error ? error.message : String(error)),
            variant: "destructive",
          })
        }
      }

      // Add the option to the current question
      setCurrentQuestion((prev) => ({
        ...prev,
        options: [...prev.options, newOptionObj],
      }))

      // Reset states
      setNewOption("")
      setOptionImageFile(null)
      setOptionImagePreview(null)
      setCurrentOptionId(null)

      toast({
        title: "Амжилттай",
        description: "Сонголт нэмэгдлээ" + (newOptionObj.imageUrl ? " зурагтай" : ""),
      })
    } catch (error) {
      console.error("Error adding option:", error)
      toast({
        title: "Алдаа",
        description: "Сонголт нэмэхэд алдаа гарлаа: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      })
    }
  }

  const removeOption = (optionId: string) => {
    setCurrentQuestion((prev) => ({
      ...prev,
      options: prev.options.filter((opt) => opt.id !== optionId),
      correctAnswers: prev.correctAnswers.filter((id) => id !== optionId),
      linkedAnswerIds: prev.linkedAnswerIds?.filter((id) => id !== optionId),
    }))
  }

  const toggleCorrectAnswer = (optionId: string) => {
    setCurrentQuestion((prev) => {
      const isAlreadyCorrect = prev.correctAnswers.includes(optionId)

      if (prev.type === "single") {
        // For single choice, replace the correct answer
        return {
          ...prev,
          correctAnswers: isAlreadyCorrect ? [] : [optionId],
        }
      } else {
        // For multiple choice, toggle the option in the array
        return {
          ...prev,
          correctAnswers: isAlreadyCorrect
            ? prev.correctAnswers.filter((id) => id !== optionId)
            : [...prev.correctAnswers, optionId],
        }
      }
    })
  }

  // Асуулт нэмэх функцийг өөрчлөх
  const addQuestion = async () => {
    // Validate question
    if (!currentQuestion.text.trim()) {
      setErrors((prev) => ({ ...prev, currentQuestion: "Асуултын текст оруулна уу" }))
      return
    }

    // Харгалзуулах асуултын хувьд тусгай шалгалт хийх
    if (currentQuestion.type === "matching") {
      if (!currentQuestion.matchingPairs?.length || currentQuestion.matchingPairs.length < 2) {
        setErrors((prev) => ({ ...prev, currentQuestion: "Хамгийн багадаа 2 харгалзуулах хос оруулна уу" }))
        return
      }
    } else {
      // Бусад төрлийн асуултын хувьд хуучин шалгалтуудыг хийх
      if (currentQuestion.type !== "text" && currentQuestion.options.length < 2) {
        setErrors((prev) => ({ ...prev, currentQuestion: "Хамгийн багадаа 2 сонголт оруулна уу" }))
        return
      }

      if (currentQuestion.type !== "text" && currentQuestion.correctAnswers.length === 0) {
        setErrors((prev) => ({ ...prev, currentQuestion: "Зөв хариултыг сонгоно уу" }))
        return
      }
    }

    try {
      setSubmitting(true)

      // Create a new question ID if it doesn't exist
      const questionId = currentQuestion.id || `question-${Date.now()}`

      // Create a new question object
      const newQuestion: Question = {
        ...currentQuestion,
        id: questionId,
      }

      // Add question image if exists (as base64)
      if (questionImagePreview) {
        newQuestion.imageUrl = questionImagePreview
      }

      if (currentQuestion.id) {
        // Update existing question
        setQuestions((prev) => prev.map((q) => (q.id === currentQuestion.id ? newQuestion : q)))
      } else {
        // Add new question
        setQuestions((prev) => [...prev, newQuestion])
      }

      // Reset current question
      setCurrentQuestion({
        id: "",
        text: "",
        type: "single",
        options: [],
        correctAnswers: [],
        points: 1,
      })

      // Reset image states
      setQuestionImageFile(null)
      setQuestionImagePreview(null)
      setOptionImageFile(null)
      setOptionImagePreview(null)
      setCurrentOptionId(null)

      setErrors((prev) => ({ ...prev, currentQuestion: "" }))

      toast({
        title: "Амжилттай",
        description: currentQuestion.id ? "Асуулт шинэчлэгдлээ" : "Асуулт нэмэгдлээ",
      })
    } catch (error) {
      console.error("Error adding question:", error)
      toast({
        title: "Алдаа",
        description: "Асуулт нэмэхэд алдаа гарлаа: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const editQuestion = (question: Question) => {
    setCurrentQuestion(question)

    // Set question image preview if exists
    if (question.imageUrl) {
      setQuestionImagePreview(question.imageUrl)
    } else {
      setQuestionImagePreview(null)
    }

    // Reset option image states
    setOptionImageFile(null)
    setOptionImagePreview(null)
    setCurrentOptionId(null)
  }

  const removeQuestion = (questionId: string) => {
    // Remove any linked question references
    setQuestions((prev) =>
      prev.map((q) =>
        q.linkedQuestionId === questionId ? { ...q, linkedQuestionId: undefined, linkedAnswerIds: [] } : q,
      ),
    )

    // Remove the question
    setQuestions((prev) => prev.filter((q) => q.id !== questionId))

    // If the current question is being edited, reset it
    if (currentQuestion.id === questionId) {
      setCurrentQuestion({
        id: "",
        text: "",
        type: "single",
        options: [],
        correctAnswers: [],
        points: 1,
      })

      setQuestionImageFile(null)
      setQuestionImagePreview(null)
    }
  }

  // validateForm функцийг өөрчлөх - харгалзуулах асуултын шалгалт нэмэх
  const validateForm = () => {
    let isValid = true
    const newErrors = { ...errors }

    // Шалгалтын үндсэн мэдээллийг шалгах
    if (!testData.title.trim()) {
      newErrors.title = "Шалгалтын нэр оруулна уу"
      isValid = false
    }

    if (!testData.description.trim()) {
      newErrors.description = "Шалгалтын тайлбар оруулна уу"
      isValid = false
    }

    if (questions.length === 0) {
      newErrors.questions = "Хамгийн багадаа 1 асуулт оруулна уу"
      isValid = false
    }

    // Одоогийн асуултыг шалгах (зөвхөн асуулт нэмэх/засах үед)
    if (currentQuestion.id || currentQuestion.text.trim()) {
      if (!currentQuestion.text.trim()) {
        setErrors((prev) => ({ ...prev, currentQuestion: "Асуултын текст оруулна уу" }))
        return false
      }

      if (currentQuestion.type === "matching") {
        if (!currentQuestion.matchingPairs?.length || currentQuestion.matchingPairs.length < 2) {
          setErrors((prev) => ({ ...prev, currentQuestion: "Хамгийн багадаа 2 харгалзуулах хос оруулна уу" }))
          return false
        }
      } else if (currentQuestion.type !== "text" && currentQuestion.options.length < 2) {
        setErrors((prev) => ({ ...prev, currentQuestion: "Хамгийн багадаа 2 сонголт оруулна уу" }))
        return false
      } else if (currentQuestion.type !== "text" && currentQuestion.correctAnswers.length === 0) {
        setErrors((prev) => ({ ...prev, currentQuestion: "Зөв хариултыг сонгоно уу" }))
        return false
      }
    }

    setErrors((prev) => ({ ...prev, ...newErrors }))
    return isValid
  }

  // Шалгалт хадгалах функцийг өөрчлөх
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Шалгалтын үндсэн мэдээллийг шалгах
    if (!validateForm()) return

    try {
      setSubmitting(true)

      // Create a new test reference in the database
      const newTestRef = push(ref(database, "tests"))
      const testId = newTestRef.key

      // Save test data to database with image as base64
      await set(newTestRef, {
        title: testData.title,
        description: testData.description,
        timeLimit: testData.timeLimit,
        passingScore: testData.passingScore,
        shuffleQuestions: testData.shuffleQuestions,
        questions: questions,
        imageUrl: imagePreview, // Store image directly as base64
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid,
      })

      toast({
        title: "Шалгалт нэмэгдлээ",
        description: "Шалгалт амжилттай нэмэгдлээ.",
      })

      // Redirect to tests page
      router.push("/admin/tests")
    } catch (error: any) {
      console.error("Error creating test:", error)
      toast({
        title: "Алдаа гарлаа",
        description: "Шалгалт нэмэхэд алдаа гарлаа: " + error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  if (!user) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  return (
    <div className="min-h-screen bg-[#0a0e17]">
      <AdminHeader>
        <div className="flex items-center gap-4">
          <UserNav user={user} />
        </div>
      </AdminHeader>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" asChild>
            <Link href="/admin/tests">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Буцах
            </Link>
          </Button>
          <h2 className="text-2xl font-bold">Шинэ шалгалт нэмэх</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Test Details */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Шалгалтын мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Шалгалтын нэр</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Шалгалтын нэр"
                      value={testData.title}
                      onChange={handleTestDataChange}
                    />
                    {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Тайлбар</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Шалгалтын тайлбар"
                      rows={3}
                      value={testData.description}
                      onChange={handleTestDataChange}
                    />
                    {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                  </div>

                  {/* Хугацааны хязгаар оруулах хэсгийг өөрчлөх - UI хэсэг */}
                  <div className="space-y-2">
                    <Label htmlFor="timeLimit">Хугацааны хязгаар (минут:секунд)</Label>
                    <Input
                      id="timeLimit"
                      type="text"
                      placeholder="30:00"
                      pattern="[0-9]{1,2}:[0-9]{2}"
                      value={testData.timeLimit}
                      onChange={handleTimeChange}
                    />
                    <p className="text-xs text-gray-500">Формат: мм:сс (жишээ: 30:00)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passingScore">Тэнцэх оноо (%)</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      min="1"
                      max="100"
                      value={testData.passingScore}
                      onChange={(e) => handleNumberChange(e, "passingScore")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="testImage">Зураг (заавал биш)</Label>
                    <Input id="testImage" type="file" accept="image/*" onChange={handleImageChange} />
                    {imagePreview && (
                      <div className="mt-2 border rounded-md p-2">
                        <img
                          src={imagePreview || "/placeholder.svg"}
                          alt="Preview"
                          className="max-h-40 object-contain mx-auto"
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-500">Зургийн хэмжээ 2MB-ээс хэтрэхгүй байх ёстой</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="shuffleQuestions"
                      checked={testData.shuffleQuestions}
                      onCheckedChange={handleSwitchChange}
                    />
                    <Label htmlFor="shuffleQuestions">Асуултуудыг холих</Label>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? "Хадгалж байна..." : "Шалгалт хадгалах"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Questions List */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Асуултууд ({questions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {questions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Асуулт нэмэгдээгүй байна</p>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((question, index) => (
                        <div
                          key={question.id}
                          className="p-3 border rounded-md hover:bg-gray-50 flex justify-between items-start"
                        >
                          <div>
                            <p className="font-medium">
                              {index + 1}.{" "}
                              {question.text.length > 50 ? question.text.substring(0, 50) + "..." : question.text}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                {question.type === "single"
                                  ? "Нэг сонголттой"
                                  : question.type === "multiple"
                                    ? "Олон сонголттой"
                                    : "Текст хариулт"}
                              </span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                {question.points} оноо
                              </span>
                              {question.imageUrl && (
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                  Зурагтай
                                </span>
                              )}
                              {question.linkedQuestionId && (
                                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                  Холбоотой асуулттай
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => editQuestion(question)}>
                              Засах
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(question.id)}>
                              <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.questions && <p className="text-sm text-red-500 mt-2">{errors.questions}</p>}
                </CardContent>
              </Card>
            </div>

            {/* Question Editor */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{currentQuestion.id ? "Асуулт засах" : "Шинэ асуулт нэмэх"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs
                    defaultValue="basic"
                    className="w-full"
                    onValueChange={(value) => {
                      if (value === "matching" && currentQuestion.type !== "matching") {
                        setCurrentQuestion((prev) => ({
                          ...prev,
                          type: "matching",
                          options: [],
                          correctAnswers: [],
                          matchingPairs: [],
                        }))
                      }
                    }}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="basic">Үндсэн мэдээлэл</TabsTrigger>
                      <TabsTrigger value="matching">Харгалзуулах асуулт</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="questionText">Асуулт</Label>
                        <Textarea
                          id="questionText"
                          name="text"
                          placeholder="Асуултын текст"
                          rows={3}
                          value={currentQuestion.text}
                          onChange={handleQuestionChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="questionImage">Асуултын зураг (заавал биш)</Label>
                        <Input id="questionImage" type="file" accept="image/*" onChange={handleQuestionImageChange} />
                        {questionImagePreview && (
                          <div className="mt-2 border rounded-md p-2">
                            <img
                              src={questionImagePreview || "/placeholder.svg"}
                              alt="Асуултын зураг"
                              className="max-h-40 object-contain mx-auto"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="questionType">Асуултын төрөл</Label>
                          <Select value={currentQuestion.type} onValueChange={handleQuestionTypeChange}>
                            <SelectTrigger id="questionType">
                              <SelectValue placeholder="Төрөл сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Нэг сонголттой</SelectItem>
                              <SelectItem value="multiple">Олон сонголттой</SelectItem>
                              <SelectItem value="text">Текст хариулт</SelectItem>
                              <SelectItem value="matching">Харгалзуулах</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="points">Оноо</Label>
                          <Input
                            id="points"
                            type="number"
                            min="1"
                            value={currentQuestion.points}
                            onChange={handlePointsChange}
                          />
                        </div>
                      </div>

                      {currentQuestion.type !== "text" && (
                        <div className="space-y-4">
                          <div className="flex items-end gap-2">
                            <div className="flex-1 space-y-2">
                              <Label htmlFor="newOption">Сонголт нэмэх</Label>
                              <Input
                                id="newOption"
                                placeholder="Сонголтын текст"
                                value={newOption}
                                onChange={(e) => setNewOption(e.target.value)}
                              />
                            </div>
                            <Button type="button" onClick={addOption} disabled={!newOption.trim()}>
                              <Plus className="h-4 w-4 mr-2" />
                              Нэмэх
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="optionImage">Сонголтын зураг (заавал биш)</Label>
                            <Input id="optionImage" type="file" accept="image/*" onChange={handleOptionImageChange} />
                            {optionImagePreview && (
                              <div className="mt-2 border rounded-md p-2">
                                <img
                                  src={optionImagePreview || "/placeholder.svg"}
                                  alt="Сонголтын зураг"
                                  className="max-h-40 object-contain mx-auto"
                                />
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Сонголтууд</Label>
                            {currentQuestion.options.length === 0 ? (
                              <p className="text-sm text-gray-500">Сонголт нэмэгдээгүй байна</p>
                            ) : (
                              <div className="space-y-2">
                                {currentQuestion.options.map((option) => (
                                  <div key={option.id} className="p-3 border rounded-md">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <input
                                          type={currentQuestion.type === "single" ? "radio" : "checkbox"}
                                          id={option.id}
                                          checked={currentQuestion.correctAnswers.includes(option.id)}
                                          onChange={() => toggleCorrectAnswer(option.id)}
                                          className="h-4 w-4"
                                        />
                                        <Label htmlFor={option.id} className="cursor-pointer">
                                          {option.text}
                                        </Label>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeOption(option.id)}
                                      >
                                        <Trash className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                    {option.imageUrl && (
                                      <div className="mt-2 border rounded-md p-2">
                                        <img
                                          src={option.imageUrl || "/placeholder.svg"}
                                          alt={option.text}
                                          className="max-h-20 object-contain mx-auto"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="matching" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="matchingQuestionText">Асуулт</Label>
                        <Textarea
                          id="matchingQuestionText"
                          name="text"
                          placeholder="Асуултын текст"
                          rows={3}
                          value={currentQuestion.text}
                          onChange={handleQuestionChange}
                        />

                        <div className="space-y-2 mt-4">
                          <Label htmlFor="questionImage">Асуултын зураг (заавал биш)</Label>
                          <Input id="questionImage" type="file" accept="image/*" onChange={handleQuestionImageChange} />
                          {questionImagePreview && (
                            <div className="mt-2 border rounded-md p-2">
                              <img
                                src={questionImagePreview || "/placeholder.svg"}
                                alt="Асуултын зураг"
                                className="max-h-40 object-contain mx-auto"
                              />
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-gray-500 mt-4 mb-2">
                          Энэ төрлийн асуултад хэрэглэгч зүүн талын утгуудыг баруун талын утгуудтай харгалзуулна
                        </p>
                      </div>

                      {currentQuestion.type === "matching" && (
                        <div className="space-y-4">
                          <div className="flex items-end gap-2">
                            <div className="flex-1 space-y-2">
                              <Label htmlFor="leftItem">Зүүн талын утга</Label>
                              <Input
                                id="leftItem"
                                placeholder="Зүүн талын утга"
                                value={newOption}
                                onChange={(e) => setNewOption(e.target.value)}
                              />
                            </div>
                            <div className="flex-1 space-y-2">
                              <Label htmlFor="rightItem">Баруун талын утга</Label>
                              <Input
                                id="rightItem"
                                placeholder="Баруун талын утга"
                                value={currentOptionId || ""}
                                onChange={(e) => setCurrentOptionId(e.target.value)}
                              />
                            </div>
                            <div className="w-24 space-y-2">
                              <Label htmlFor="pairPoints">Оноо</Label>
                              <Input
                                id="pairPoints"
                                type="number"
                                min="1"
                                placeholder="Оноо"
                                value={pairPoints || "1"}
                                onChange={(e) => setPairPoints(Number(e.target.value) || 1)}
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={() => {
                                if (newOption.trim() && currentOptionId?.trim()) {
                                  // Харгалзуулах хос нэмэх
                                  setCurrentQuestion((prev) => ({
                                    ...prev,
                                    matchingPairs: [
                                      ...(prev.matchingPairs || []),
                                      {
                                        left: newOption.trim(),
                                        right: currentOptionId!.trim(),
                                        points: pairPoints || 1,
                                      },
                                    ],
                                  }))
                                  setNewOption("")
                                  setCurrentOptionId("")
                                }
                              }}
                              disabled={!newOption.trim() || !currentOptionId?.trim()}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Хос нэмэх
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label>Харгалзуулах хосууд</Label>
                            {!currentQuestion.matchingPairs?.length ? (
                              <p className="text-sm text-gray-500">Харгалзуулах хос нэмэгдээгүй байна</p>
                            ) : (
                              <div className="space-y-2">
                                {currentQuestion.matchingPairs.map((pair, index) => (
                                  <div key={index} className="p-3 border rounded-md flex justify-between items-center">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="bg-blue-100 p-2 rounded-md flex-1">
                                        <p>{pair.left}</p>
                                      </div>
                                      <div className="flex-shrink-0">→</div>
                                      <div className="bg-green-100 p-2 rounded-md flex-1">
                                        <p>{pair.right}</p>
                                      </div>
                                      <div className="bg-purple-100 p-2 rounded-md w-16 text-center">
                                        <p>{pair.points || 1} оноо</p>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setCurrentQuestion((prev) => ({
                                          ...prev,
                                          matchingPairs: prev.matchingPairs?.filter((_, i) => i !== index),
                                        }))
                                      }}
                                    >
                                      <Trash className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {errors.currentQuestion && <p className="text-sm text-red-500">{errors.currentQuestion}</p>}

                  <div className="pt-4 flex justify-end">
                    <Button type="button" onClick={addQuestion}>
                      <Save className="h-4 w-4 mr-2" />
                      {currentQuestion.id ? "Асуулт шинэчлэх" : "Асуулт нэмэх"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

