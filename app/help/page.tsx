"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, BookOpen, Lightbulb, Award, User, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { auth, database } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { ref, get } from "firebase/database"
import { UserNav } from "@/components/user-nav"
import { Footer } from "@/components/footer"
import { SiteHeader } from "@/components/site-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface UserData {
  firstName: string
  lastName: string
  email: string
  role?: string
  profileImage?: string
}

export default function HelpPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Get user data from database
        const userRef = ref(database, `users/${currentUser.uid}`)
        const userSnapshot = await get(userRef)

        if (userSnapshot.exists()) {
          const userData = userSnapshot.val()
          setUser(userData)
        }
      }
      setLoading(false)
    })

    return () => {
      unsubscribeAuth()
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      {/* Хэрэглэгчийн нэр болон товчнуудыг томруулах */}
      <SiteHeader>
        <div className="flex items-center gap-4">
          {user && <UserNav user={user} />}
          {!user && (
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Нэвтрэх</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Бүртгүүлэх</Link>
              </Button>
            </div>
          )}
        </div>
      </SiteHeader>

      <main className="container mx-auto px-4 py-8 flex-1 pt-16">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="back" size="icon" asChild>
            <Link href="/dashboard">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h2 className="text-2xl font-bold text-white">Тусламж</h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="mb-8 bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Нацагдорж Багшийн Номын Порталын тухай
              </CardTitle>
              <CardDescription className="text-cyan-300/80">
                Энэхүү платформ нь тусгай эрхтэй хэрэглэгчдэд зориулсан онлайн сургалтын платформ юм
              </CardDescription>
            </CardHeader>
            <CardContent className="prose max-w-none text-cyan-300/80">
              <p>
                Нацагдорж Багшийн Номын Портал нь хэрэглэгчдэд шалгалт өгөх, дүнгээ харах, мэдлэгээ сорих боломжийг
                олгодог онлайн платформ юм. Энэхүү платформ нь хэрэглэгчдэд дараах боломжуудыг олгоно:
              </p>
              <ul className="text-cyan-300/80">
                <li>Шалгалт өгөх</li>
                <li>Шалгалтын дүнг харах</li>
                <li>Бусад хэрэглэгчидтэй өөрийн дүнг харьцуулах (ранк)</li>
                <li>Хувийн мэдээллээ удирдах</li>
              </ul>
            </CardContent>
          </Card>

          <Tabs defaultValue="getting-started">
            <TabsList className="grid w-full grid-cols-4 bg-card/50 border border-border/30">
              <TabsTrigger value="getting-started">Эхлэх</TabsTrigger>
              <TabsTrigger value="tests">Шалгалтууд</TabsTrigger>
              <TabsTrigger value="results">Дүн ба Ранк</TabsTrigger>
              <TabsTrigger value="profile">Профайл</TabsTrigger>
            </TabsList>

            <TabsContent value="getting-started" className="mt-6">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Эхлэх
                  </CardTitle>
                  <CardDescription className="text-cyan-300/80">
                    Системд бүртгүүлэх, нэвтрэх болон үндсэн функцуудын тухай
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Бүртгүүлэх</h3>
                    <p className="text-cyan-300/80">Системд бүртгүүлэхийн тулд дараах алхмуудыг дагана уу:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Нүүр хуудас дээрх "Бүртгүүлэх" товчийг дарна</li>
                      <li>Номын тусгай кодыг оруулна (Номын хамт өгөгдсөн код)</li>
                      <li>Хувийн мэдээллээ үнэн зөв оруулна</li>
                      <li>Нууц үгээ оруулна (хамгийн багадаа 6 тэмдэгт)</li>
                      <li>"Бүртгүүлэх" товчийг дарна</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Нэвтрэх</h3>
                    <p className="text-cyan-300/80">Системд нэвтрэхийн тулд дараах алхмуудыг дагана уу:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Нүүр хуудас дээрх "Нэвтрэх" товчийг дарна</li>
                      <li>Бүртгэлийн имэйл хаяг эсвэл утасны дугаар, эсвэл нэрээ оруулна</li>
                      <li>Нууц үгээ оруулна</li>
                      <li>"Нэвтрэх" товчийг дарна</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Үндсэн хуудас</h3>
                    <p className="text-cyan-300/80">
                      Нэвтэрсний дараа та үндсэн хуудас руу шилжинэ. Энд та дараах зүйлсийг хийх боломжтой:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Шалгалтуудыг харах</li>
                      <li>Шалгалт өгөх</li>
                      <li>Шалгалтын дүн харах</li>
                      <li>Ранк харах</li>
                      <li>Профайл мэдээллээ удирдах</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tests" className="mt-6">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Шалгалтууд
                  </CardTitle>
                  <CardDescription className="text-cyan-300/80">
                    Шалгалт өгөх, шалгалтын төрлүүд болон бусад мэдээлэл
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Шалгалт өгөх</h3>
                    <p className="text-cyan-300/80">Шалгалт өгөхийн тулд дараах алхмуудыг дагана уу:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Үндсэн хуудас дээрх шалгалтуудаас сонгоно</li>
                      <li>"Шалгалт өгөх" товчийг дарна</li>
                      <li>Шалгалтын мэдээлэлтэй танилцана</li>
                      <li>"Шалгалт эхлүүлэх" товчийг дарна</li>
                      <li>Асуултуудад хариулна</li>
                      <li>Шалгалт дуусгах товчийг дарна эсвэл хугацаа дуусахад автоматаар дуусна</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Шалгалтын төрлүүд</h3>
                    <p className="text-cyan-300/80">Системд дараах төрлийн асуултууд байдаг:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>
                        <strong className="text-white">Нэг сонголттой асуулт</strong> - Зөвхөн нэг зөв хариулттай
                      </li>
                      <li>
                        <strong className="text-white">Олон сонголттой асуулт</strong> - Нэгээс олон зөв хариулттай байж
                        болно
                      </li>
                      <li>
                        <strong className="text-white">Текст хариулт</strong> - Хариултыг бичиж оруулах
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Шалгалт дахин өгөх</h3>
                    <p className="text-cyan-300/80">Шалгалтыг дахин өгөх боломжтой. Үүний тулд:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Шалгалтын дүн хуудас дээр "Дахин өгөх" товчийг дарах</li>
                      <li>Эсвэл үндсэн хуудас дээрх шалгалтын "Шалгалт өгөх/Дахин өгөх" товчийг дарах</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="mt-6">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-500" />
                    Дүн ба Ранк
                  </CardTitle>
                  <CardDescription className="text-cyan-300/80">
                    Шалгалтын дүн харах, ранк харах болон бусад мэдээлэл
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Шалгалтын дүн</h3>
                    <p className="text-cyan-300/80">Шалгалтын дүнг харахын тулд:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Үндсэн хуудас дээрх "Шалгалтын дүн" товчийг дарна</li>
                      <li>Эсвэл шалгалт дууссаны дараа "Бүх шалгалтын дүн харах" товчийг дарна</li>
                    </ol>
                    <p className="text-cyan-300/80 mt-2">
                      Шалгалтын дүн хуудас дээр та дараах мэдээллийг харах боломжтой:
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Дүнгийн голч - Таны бүх шалгалтын дүнгийн дундаж</li>
                      <li>Шалгалт бүрийн дүн - Оноо, хувь, тэнцсэн эсэх</li>
                      <li>Оролдлогын тоо - Хэдэн удаа шалгалт өгсөн</li>
                      <li>Тэнцсэн шалгалтын тоо</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Ранк</h3>
                    <p className="text-cyan-300/80">
                      Ранк хуудас дээр та бусад хэрэглэгчидтэй өөрийн дүнг харьцуулах боломжтой:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Үндсэн хуудас дээрх "Ранк" товчийг дарна</li>
                      <li>Эсвэл шалгалтын дүн хуудас дээрх "Ранк харах" товчийг дарна</li>
                    </ol>
                    <p className="text-cyan-300/80 mt-2">Ранк хуудас дээр дараах мэдээлэл харагдана:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Хэрэглэгчдийн ранк - Дүнгийн голчоор эрэмбэлэгдсэн</li>
                      <li>Топ 3 хэрэглэгч тусгай тэмдэглэгээтэй харагдана</li>
                      <li>Таны байр тусгай тэмдэглэгээтэй харагдана</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Ранкд харагдах тохиргоо</h3>
                    <p className="text-cyan-300/80">Та өөрийн дүнг ранк дээр харагдах эсэхийг тохируулах боломжтой:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Профайл хуудас руу орно</li>
                      <li>"Ранк дээр харагдах" тохиргоог асаах/унтраах</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-purple-500" />
                    Профайл
                  </CardTitle>
                  <CardDescription className="text-cyan-300/80">
                    Хувийн мэдээллээ удирдах, нууц үг солих болон бусад тохиргоо
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Профайл мэдээлэл засах</h3>
                    <p className="text-cyan-300/80">Профайл мэдээллээ засахын тулд:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Хэрэглэгчийн нэр дээр дарж "Профайл" сонголтыг сонгоно</li>
                      <li>"Засах" товчийг дарна</li>
                      <li>Мэдээллээ шинэчилнэ</li>
                      <li>"Хадгалах" товчийг дарна</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Профайл зураг оруулах</h3>
                    <p className="text-cyan-300/80">Профайл зураг оруулахын тулд:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Профайл хуудас руу орно</li>
                      <li>"Засах" товчийг дарна</li>
                      <li>Профайл зураг дээрх камер товчийг дарна эсвэл "Профайл зураг оруулах" товчийг дарна</li>
                      <li>Зургаа сонгоно</li>
                      <li>"Хадгалах" товчийг дарна</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Нууц үг солих</h3>
                    <p className="text-cyan-300/80">Нууц үгээ солихын тулд:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Профайл хуудас руу орно</li>
                      <li>"Нууц үг" таб руу шилжинэ</li>
                      <li>Одоогийн нууц үгээ оруулна</li>
                      <li>Шинэ нууц үгээ оруулна</li>
                      <li>Шинэ нууц үгээ давтан оруулна</li>
                      <li>"Нууц үг солих" товчийг дарна</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Гарах</h3>
                    <p className="text-cyan-300/80">Системээс гарахын тулд:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4 text-cyan-300/80">
                      <li>Хэрэглэгчийн нэр дээр дарна</li>
                      <li>"Гарах" сонголтыг сонгоно</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  )
}

