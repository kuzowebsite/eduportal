"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Save, Eye, EyeOff, Pencil, Upload, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { auth, database } from "@/lib/firebase"
import {
  onAuthStateChanged,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth"
import { ref, onValue, update } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { UserNav } from "@/components/user-nav"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SiteHeader } from "@/components/site-header"

interface User {
  firstName: string
  lastName: string
  email: string
  phone: string
  createdAt: string
  id: string
  profileImage?: string
  showInRank?: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Профайл мэдээлэл
  const [profileData, setProfileData] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
    profileImage: "",
    showInRank: false,
  })

  // Нууц үг солих
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Нууц үг харуулах/нуух
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Алдааны мэдээлэл
  const [errors, setErrors] = useState({
    profile: "",
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
    profileImage: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

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

          // Set user state
          setUser({
            ...userData,
            id: currentUser.uid,
          })

          // profileData-г өөрчлөх - showInRank-ийг үргэлж true болгох
          // Set profile form data
          setProfileData({
            lastName: userData.lastName || "",
            firstName: userData.firstName || "",
            phone: userData.phone || "",
            email: userData.email || "",
            profileImage: userData.profileImage || "",
            showInRank: userData.showInRank !== undefined ? userData.showInRank : false, // Always true
          })
        } else {
          // User data not found in database
          signOut(auth).then(() => {
            router.push("/login")
          })
        }
        setLoading(false)
      })

      return () => {
        unsubscribeUser()
      }
    })

    return () => {
      unsubscribeAuth()
    }
  }, [router])

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))

    // Clear error when typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleShowInRankChange = (checked: boolean) => {
    setProfileData((prev) => ({ ...prev, showInRank: checked }))
  }

  const handleToggleShowInRank = async (checked: boolean) => {
    // Update state
    setProfileData((prev) => ({ ...prev, showInRank: checked }))

    try {
      // Update user data in database
      const userRef = ref(database, `users/${user?.id}`)
      await update(userRef, {
        showInRank: checked,
      })

      toast({
        title: "Тохиргоо хадгалагдлаа",
        description: checked
          ? "Таны дүнгийн голч ранк дээр харагдах болно."
          : "Таны дүнгийн голч ранк дээр харагдахгүй болно.",
      })
    } catch (error: any) {
      console.error("Error updating rank visibility:", error)

      // Revert state on error
      setProfileData((prev) => ({ ...prev, showInRank: !checked }))

      toast({
        title: "Алдаа гарлаа",
        description: "Тохиргоо хадгалахад алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      })
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))

    // Clear error when typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, profileImage: "Зөвхөн зураг оруулна уу" }))
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, profileImage: "Зургийн хэмжээ 2MB-ээс хэтрэхгүй байх ёстой" }))
        return
      }

      // Clear error
      setErrors((prev) => ({ ...prev, profileImage: "" }))

      // Convert to base64
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target) {
          const base64String = event.target.result as string
          setProfileData((prev) => ({ ...prev, profileImage: base64String }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const validateProfileForm = () => {
    let isValid = true
    const newErrors = { ...errors }

    if (!profileData.lastName.trim()) {
      newErrors.lastName = "Овог оруулна уу"
      isValid = false
    }

    if (!profileData.firstName.trim()) {
      newErrors.firstName = "Нэр оруулна уу"
      isValid = false
    }

    if (!profileData.phone.trim()) {
      newErrors.phone = "Утасны дугаар оруулна уу"
      isValid = false
    } else if (!/^\d{8}$/.test(profileData.phone)) {
      newErrors.phone = "Утасны дугаар 8 оронтой байх ёстой"
      isValid = false
    }

    setErrors((prev) => ({ ...prev, ...newErrors }))
    return isValid
  }

  const validatePasswordForm = () => {
    let isValid = true
    const newErrors = { ...errors }

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Одоогийн нууц үгээ оруулна уу"
      isValid = false
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "Шинэ нууц үг оруулна уу"
      isValid = false
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой"
      isValid = false
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Нууц үг таарахгүй байна"
      isValid = false
    }

    setErrors((prev) => ({ ...prev, ...newErrors }))
    return isValid
  }

  // handleSaveProfile функцийг өөрчлөх - showInRank-ийг үргэлж true болгох
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateProfileForm()) return

    try {
      setSaving(true)

      // Update user data in database
      const userRef = ref(database, `users/${user?.id}`)
      await update(userRef, {
        lastName: profileData.lastName,
        firstName: profileData.firstName,
        phone: profileData.phone,
        profileImage: profileData.profileImage,
        showInRank: profileData.showInRank,
        // Note: We don't update email here as it requires special Firebase Auth handling
      })

      toast({
        title: "Профайл шинэчлэгдлээ",
        description: "Таны мэдээлэл амжилттай шинэчлэгдлээ.",
      })

      // Exit edit mode
      setEditMode(false)
    } catch (error: any) {
      console.error("Error updating profile:", error)
      setErrors((prev) => ({ ...prev, profile: "Профайл шинэчлэхэд алдаа гарлаа: " + error.message }))

      toast({
        title: "Алдаа гарлаа",
        description: "Профайл шинэчлэхэд алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePasswordForm()) return

    try {
      setChangingPassword(true)

      // Re-authenticate user before changing password
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("Хэрэглэгч олдсонгүй")
      }

      const credential = EmailAuthProvider.credential(currentUser.email || "", passwordData.currentPassword)

      // Re-authenticate
      await reauthenticateWithCredential(currentUser, credential)

      // Update password
      await updatePassword(currentUser, passwordData.newPassword)

      // Reset password form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast({
        title: "Нууц үг шинэчлэгдлээ",
        description: "Таны нууц үг амжилттай шинэчлэгдлээ.",
      })
    } catch (error: any) {
      console.error("Error changing password:", error)

      // Handle specific Firebase errors
      if (error.code === "auth/wrong-password") {
        setErrors((prev) => ({ ...prev, currentPassword: "Одоогийн нууц үг буруу байна" }))
      } else if (error.code === "auth/too-many-requests") {
        setErrors((prev) => ({ ...prev, currentPassword: "Хэт олон удаа буруу оролдлого хийсэн тул түр хүлээнэ үү" }))
      } else {
        setErrors((prev) => ({ ...prev, currentPassword: "Нууц үг солиход алдаа гарлаа: " + error.message }))
      }

      toast({
        title: "Алдаа гарлаа",
        description: "Нууц үг солиход алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      })
    } finally {
      setChangingPassword(false)
    }
  }

  // Get initials from first and last name
  const getInitials = () => {
    const firstInitial = user?.firstName ? user.firstName.charAt(0) : ""
    const lastInitial = user?.lastName ? user.lastName.charAt(0) : ""
    return (firstInitial + lastInitial).toUpperCase()
  }

  if (loading) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  if (!user) {
    return <div className="container mx-auto p-8 text-center">Ачааллаж байна...</div>
  }

  return (
    <div className="min-h-screen bg-[#0a0e17]">
      <SiteHeader>
        <div className="flex items-center gap-4">
          <UserNav user={user} />
        </div>
      </SiteHeader>

      <main className="container mx-auto px-4 py-8 pt-16 text-white">
        <div className="flex items-center gap-4 mb-4">
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
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300">
            Хувийн мэдээлэл
          </h2>
        </div>

        <div className="max-w-3xl mx-auto -mt-2">
          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Профайл</TabsTrigger>
              <TabsTrigger value="password">Нууц үг</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Профайл мэдээлэл</CardTitle>
                    <CardDescription>Хувийн мэдээллээ шинэчлэх</CardDescription>
                  </div>
                  {!editMode && (
                    <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Засах
                    </Button>
                  )}
                </CardHeader>
                <form onSubmit={handleSaveProfile}>
                  <CardContent className="space-y-4">
                    {/* Profile Image */}
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        <Avatar className="h-24 w-24">
                          {profileData.profileImage ? (
                            <AvatarImage
                              src={profileData.profileImage}
                              alt={`${profileData.firstName} ${profileData.lastName}`}
                            />
                          ) : null}
                          <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                        </Avatar>
                        {editMode && (
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                            onClick={triggerFileInput}
                          >
                            <Camera className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                      />
                      {editMode && (
                        <Button type="button" variant="outline" size="sm" onClick={triggerFileInput}>
                          <Upload className="h-4 w-4 mr-2" />
                          Профайл зураг оруулах
                        </Button>
                      )}
                      {errors.profileImage && <p className="text-sm text-red-500">{errors.profileImage}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Овог</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Овог"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                        disabled={!editMode}
                        className={!editMode ? "bg-card/50 border-border/30" : "bg-card/50 border-border/30"}
                      />
                      {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="firstName">Нэр</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="Нэр"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                        disabled={!editMode}
                        className={!editMode ? "bg-card/50 border-border/30" : "bg-card/50 border-border/30"}
                      />
                      {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Утасны дугаар</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="Утасны дугаар"
                        value={profileData.phone}
                        onChange={handleProfileChange}
                        disabled={!editMode}
                        className={!editMode ? "bg-card/50 border-border/30" : "bg-card/50 border-border/30"}
                      />
                      {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Имэйл</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="name@example.com"
                        value={profileData.email}
                        disabled
                        className="bg-card/50 border-border/30"
                      />
                      <p className="text-xs text-gray-500">Имэйл хаягийг өөрчлөх боломжгүй</p>
                    </div>

                    {/* Ранк дээр харагдах тохиргоо */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showInRank" className="cursor-pointer">
                          Ранк дээр харагдах
                        </Label>
                        <Switch
                          id="showInRank"
                          checked={profileData.showInRank}
                          onCheckedChange={handleToggleShowInRank}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {profileData.showInRank
                          ? "Таны дүнгийн голч ранк дээр харагдана"
                          : "Таны дүнгийн голч ранк дээр харагдахгүй"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Бүртгүүлсэн огноо</Label>
                      <Input
                        value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Тодорхойгүй"}
                        disabled
                        className="bg-card/50 border-border/30"
                      />
                    </div>

                    {errors.profile && <p className="text-sm text-red-500">{errors.profile}</p>}
                  </CardContent>
                  {editMode && (
                    <CardFooter className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
                        Цуцлах
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          "Хадгалж байна..."
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Хадгалах
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  )}
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card className="bg-card/80 backdrop-blur-sm border border-border/30 shadow-lg shadow-black/10 text-white">
                <CardHeader>
                  <CardTitle>Нууц үг солих</CardTitle>
                  <CardDescription>Нууц үгээ шинэчлэх</CardDescription>
                </CardHeader>
                <form onSubmit={handleChangePassword}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Одоогийн нууц үг</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          name="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Одоогийн нууц үг"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.currentPassword && <p className="text-sm text-red-500">{errors.currentPassword}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Шинэ нууц үг</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Шинэ нууц үг"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.newPassword && <p className="text-sm text-red-500">{errors.newPassword}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Шинэ нууц үг давтах</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Шинэ нууц үг давтах"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={changingPassword}>
                      {changingPassword ? "Солиж байна..." : "Нууц үг солих"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

